-- Re-apply migration with corrected seed CTE columns

-- 1) Add sort_order to permission_objects
ALTER TABLE public.permission_objects
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- 2) Ensure role_permissions table exists
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name public.account_role_type NOT NULL,
  permission_object_id uuid NOT NULL REFERENCES public.permission_objects(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_name, permission_object_id)
);

-- Trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_role_permissions_updated_at'
  ) THEN
    CREATE TRIGGER update_role_permissions_updated_at
    BEFORE UPDATE ON public.role_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 3) RLS policies
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_permissions' AND policyname = 'Authenticated can view role permissions'
  ) THEN
    CREATE POLICY "Authenticated can view role permissions"
    ON public.role_permissions
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_permissions' AND policyname = 'Admins can manage role permissions'
  ) THEN
    CREATE POLICY "Admins can manage role permissions"
    ON public.role_permissions
    FOR ALL
    USING (has_account_role(auth.uid(), ARRAY['owner'::public.account_role_type, 'admin_partner'::public.account_role_type]))
    WITH CHECK (has_account_role(auth.uid(), ARRAY['owner'::public.account_role_type, 'admin_partner'::public.account_role_type]));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_name ON public.role_permissions(role_name);
CREATE INDEX IF NOT EXISTS idx_role_permissions_object_id ON public.role_permissions(permission_object_id);

-- 4) Update functions
CREATE OR REPLACE FUNCTION public.get_role_permissions(role_name_param text)
RETURNS TABLE(
  object_name text,
  display_name text,
  category text,
  can_view boolean,
  can_edit boolean,
  can_delete boolean,
  can_create boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT 
    po.name,
    po.display_name,
    po.category,
    COALESCE(rp.can_view, false),
    COALESCE(rp.can_edit, false),
    COALESCE(rp.can_delete, false),
    COALESCE(rp.can_create, false)
  FROM public.permission_objects po
  LEFT JOIN public.role_permissions rp ON po.id = rp.permission_object_id 
    AND rp.role_name::text = role_name_param
  WHERE po.is_active = true
  ORDER BY po.category, po.sort_order, po.display_name;
$function$;

CREATE OR REPLACE FUNCTION public.check_user_permission(user_id_param uuid, object_name_param text, action_param text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_role public.account_role_type;
  has_permission BOOLEAN := false;
BEGIN
  -- Owner override: owners always have full access
  SELECT public.get_highest_account_role(user_id_param) INTO user_role;
  IF user_role = 'owner'::public.account_role_type THEN
    RETURN true;
  END IF;

  -- Check permission based on action in role_permissions matrix
  SELECT 
    CASE action_param
      WHEN 'view' THEN rp.can_view
      WHEN 'edit' THEN rp.can_edit
      WHEN 'delete' THEN rp.can_delete
      WHEN 'create' THEN rp.can_create
      ELSE false
    END INTO has_permission
  FROM public.role_permissions rp
  JOIN public.permission_objects po ON rp.permission_object_id = po.id
  WHERE rp.role_name = user_role
    AND po.name = object_name_param
    AND po.is_active = true;

  RETURN COALESCE(has_permission, false);
END;
$function$;

-- 5) Seed/Upsert permission objects
INSERT INTO public.permission_objects (name, display_name, category, is_active, sort_order)
VALUES
  ('permissions', 'Permissions Management', 'Administration', true, 10),
  ('user_management', 'User Management', 'Administration', true, 20),
  ('hap_payments', 'HAP Payments', 'Financial', true, 10),
  ('rent_payments', 'Rent Payments', 'Financial', true, 20),
  ('rent_splits', 'Rent Splits', 'Financial', true, 30),
  ('subscriptions', 'Subscriptions', 'Financial', true, 40)
ON CONFLICT (name) DO UPDATE
SET display_name = EXCLUDED.display_name,
    category = EXCLUDED.category,
    is_active = true,
    sort_order = EXCLUDED.sort_order;

-- 6) Seed default role permissions (idempotent)
WITH objs AS (
  SELECT id, name FROM public.permission_objects WHERE name IN (
    'permissions','user_management','hap_payments','rent_payments','rent_splits','subscriptions'
  )
),
role_matrix(role_name, obj, can_view, can_edit, can_delete, can_create) AS (
  -- owner full rights for all objects
  SELECT 'owner'::public.account_role_type, o.name, true, true, true, true FROM objs o
  UNION ALL
  SELECT 'admin_partner'::public.account_role_type, 'permissions', true, false, false, false
  UNION ALL
  SELECT 'admin_partner'::public.account_role_type, 'user_management', true, false, false, true
  UNION ALL
  SELECT 'admin_partner'::public.account_role_type, 'hap_payments', true, false, false, false
  UNION ALL
  SELECT 'admin_partner'::public.account_role_type, 'rent_payments', true, false, true, false
  UNION ALL
  SELECT 'admin_partner'::public.account_role_type, 'rent_splits', true, false, false, true
  UNION ALL
  SELECT 'admin_partner'::public.account_role_type, 'subscriptions', true, false, false, false
  UNION ALL
  SELECT 'support_assistant'::public.account_role_type, 'permissions', true, false, false, false
  UNION ALL
  SELECT 'support_assistant'::public.account_role_type, 'user_management', true, false, false, false
  UNION ALL
  SELECT 'support_assistant'::public.account_role_type, 'hap_payments', true, false, false, false
  UNION ALL
  SELECT 'support_assistant'::public.account_role_type, 'rent_payments', true, false, false, false
  UNION ALL
  SELECT 'support_assistant'::public.account_role_type, 'rent_splits', true, false, false, false
  UNION ALL
  SELECT 'support_assistant'::public.account_role_type, 'subscriptions', true, false, false, false
)
INSERT INTO public.role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT rm.role_name, o.id, rm.can_view, rm.can_edit, rm.can_delete, rm.can_create
FROM role_matrix rm
JOIN objs o ON o.name = rm.obj
ON CONFLICT (role_name, permission_object_id) DO UPDATE
SET can_view = EXCLUDED.can_view,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete,
    can_create = EXCLUDED.can_create;
