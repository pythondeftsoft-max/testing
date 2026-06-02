-- Create the missing portfolio_role_permissions table
CREATE TABLE IF NOT EXISTS public.portfolio_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name portfolio_role_type NOT NULL,
  permission_object_id uuid NOT NULL REFERENCES public.permission_objects(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(role_name, permission_object_id)
);

-- Enable RLS
ALTER TABLE public.portfolio_role_permissions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view portfolio role permissions"
  ON public.portfolio_role_permissions FOR SELECT
  TO authenticated
  USING (true);

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.get_portfolio_effective_permissions(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_portfolio_permission(uuid, uuid, text, text) TO authenticated;

-- Seed default portfolio role permissions
INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'admin_partner'::portfolio_role_type,
  po.id,
  true, true, true, true
FROM public.permission_objects po
WHERE po.scope = 'portfolio' AND po.is_active = true
ON CONFLICT (role_name, permission_object_id) 
DO UPDATE SET can_view = true, can_edit = true, can_delete = true, can_create = true;

INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'editor'::portfolio_role_type,
  po.id,
  true, true, false, true
FROM public.permission_objects po
WHERE po.scope = 'portfolio' AND po.is_active = true
ON CONFLICT (role_name, permission_object_id) 
DO UPDATE SET can_view = true, can_edit = true, can_delete = false, can_create = true;

INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'viewer'::portfolio_role_type,
  po.id,
  true, false, false, false
FROM public.permission_objects po
WHERE po.scope = 'portfolio' AND po.is_active = true
ON CONFLICT (role_name, permission_object_id) 
DO UPDATE SET can_view = true, can_edit = false, can_delete = false, can_create = false;