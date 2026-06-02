
BEGIN;

-- 1) Create enum for permission scope (account vs portfolio)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'permission_scope') THEN
    CREATE TYPE public.permission_scope AS ENUM ('account', 'portfolio');
  END IF;
END$$;

-- 2) Add scope to permission_objects (default everything existing to account)
ALTER TABLE public.permission_objects
  ADD COLUMN IF NOT EXISTS scope public.permission_scope NOT NULL DEFAULT 'account';

-- 3) Ensure unique object names for stable upserts/seeding
CREATE UNIQUE INDEX IF NOT EXISTS ux_permission_objects_object_name
  ON public.permission_objects (object_name);

-- 4) Portfolio role permissions (global per role templates)
CREATE TABLE IF NOT EXISTS public.portfolio_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name public.portfolio_role_type NOT NULL,
  permission_object_id uuid NOT NULL REFERENCES public.permission_objects(id) ON DELETE CASCADE,
  can_view boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_prp_role_object
  ON public.portfolio_role_permissions (role_name, permission_object_id);

-- 4a) RLS for portfolio_role_permissions (account-level admins own management)
ALTER TABLE public.portfolio_role_permissions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'portfolio_role_permissions'
      AND policyname = 'Admins can view portfolio role permissions'
  ) THEN
    CREATE POLICY "Admins can view portfolio role permissions"
      ON public.portfolio_role_permissions
      FOR SELECT
      USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type, 'support_assistant'::account_role_type]));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'portfolio_role_permissions'
      AND policyname = 'Admins can manage portfolio role permissions'
  ) THEN
    CREATE POLICY "Admins can manage portfolio role permissions"
      ON public.portfolio_role_permissions
      FOR ALL
      USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]))
      WITH CHECK (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));
  END IF;
END$$;

-- 5) Permission helpers

-- 5a) Portfolio permission checker; treats portfolio admin_partner as superuser.
CREATE OR REPLACE FUNCTION public.has_portfolio_permission(
  p_user_id uuid,
  p_portfolio_id uuid,
  p_object text,
  p_action text
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.portfolio_role_type;
  v_allowed boolean;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Everything view (no specific portfolio): allow account owners/admin_partners
  IF p_portfolio_id IS NULL THEN
    RETURN has_account_role(p_user_id, ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]);
  END IF;

  -- Portfolio admin_partner can do everything
  IF has_portfolio_role(p_portfolio_id, p_user_id, ARRAY['admin_partner'::portfolio_role_type]) THEN
    RETURN true;
  END IF;

  -- Determine user's role in this portfolio
  SELECT public.get_user_portfolio_role(p_portfolio_id, p_user_id) INTO v_role;
  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  -- Check mapped permission
  SELECT
    CASE lower(p_action)
      WHEN 'view' THEN prp.can_view
      WHEN 'edit' THEN prp.can_edit
      WHEN 'create' THEN prp.can_create
      WHEN 'delete' THEN prp.can_delete
      ELSE false
    END
  INTO v_allowed
  FROM public.permission_objects po
  JOIN public.portfolio_role_permissions prp
    ON prp.permission_object_id = po.id
   AND prp.role_name = v_role
  WHERE po.object_name = p_object
    AND po.scope = 'portfolio';

  RETURN COALESCE(v_allowed, false);
END;
$$;

-- 5b) UI helper to fetch all portfolio-scoped permissions for a role
CREATE OR REPLACE FUNCTION public.get_portfolio_role_permissions(
  p_role public.portfolio_role_type
)
RETURNS TABLE(
  object_name text,
  display_name text,
  category text,
  description text,
  can_view boolean,
  can_edit boolean,
  can_create boolean,
  can_delete boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    po.object_name,
    po.display_name,
    po.category,
    COALESCE(po.description, '')::text AS description,
    COALESCE(prp.can_view, false)  AS can_view,
    COALESCE(prp.can_edit, false)  AS can_edit,
    COALESCE(prp.can_create, false) AS can_create,
    COALESCE(prp.can_delete, false) AS can_delete
  FROM public.permission_objects po
  LEFT JOIN public.portfolio_role_permissions prp
    ON prp.permission_object_id = po.id
   AND prp.role_name = p_role
  WHERE po.scope = 'portfolio'
  ORDER BY po.category, po.display_name;
$$;

-- 6) Seed portfolio-scoped analytics permission objects (idempotent)
INSERT INTO public.permission_objects (object_name, display_name, category, scope)
SELECT 'analytics.dashboard', 'Analytics Dashboard', 'analytics', 'portfolio'::public.permission_scope
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE object_name = 'analytics.dashboard');

INSERT INTO public.permission_objects (object_name, display_name, category, scope)
SELECT 'analytics.portfolio_trends', 'Portfolio Trends', 'analytics', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE object_name = 'analytics.portfolio_trends');

INSERT INTO public.permission_objects (object_name, display_name, category, scope)
SELECT 'analytics.asset_allocation', 'Asset Allocation', 'analytics', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE object_name = 'analytics.asset_allocation');

INSERT INTO public.permission_objects (object_name, display_name, category, scope)
SELECT 'analytics.income_expense', 'Income vs Expense', 'analytics', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE object_name = 'analytics.income_expense');

INSERT INTO public.permission_objects (object_name, display_name, category, scope)
SELECT 'analytics.cashflow', 'Cash Flow', 'analytics', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE object_name = 'analytics.cashflow');

INSERT INTO public.permission_objects (object_name, display_name, category, scope)
SELECT 'analytics.advanced_charts', 'Advanced Charts', 'analytics', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE object_name = 'analytics.advanced_charts');

-- 7) Seed default mappings per portfolio role (idempotent)
-- Viewer: can view analytics
INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view)
SELECT 'viewer'::public.portfolio_role_type, po.id, true
FROM public.permission_objects po
WHERE po.object_name IN (
  'analytics.dashboard',
  'analytics.portfolio_trends',
  'analytics.asset_allocation',
  'analytics.income_expense',
  'analytics.cashflow',
  'analytics.advanced_charts'
)
ON CONFLICT (role_name, permission_object_id)
DO UPDATE SET can_view = EXCLUDED.can_view, updated_at = now();

-- Editor: also view analytics (edit/create/delete not applicable for charts yet)
INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view)
SELECT 'editor'::public.portfolio_role_type, po.id, true
FROM public.permission_objects po
WHERE po.object_name IN (
  'analytics.dashboard',
  'analytics.portfolio_trends',
  'analytics.asset_allocation',
  'analytics.income_expense',
  'analytics.cashflow',
  'analytics.advanced_charts'
)
ON CONFLICT (role_name, permission_object_id)
DO UPDATE SET can_view = EXCLUDED.can_view, updated_at = now();

-- Admin partner: full permissions
INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_create, can_delete)
SELECT 'admin_partner'::public.portfolio_role_type, po.id, true, true, true, true
FROM public.permission_objects po
WHERE po.object_name IN (
  'analytics.dashboard',
  'analytics.portfolio_trends',
  'analytics.asset_allocation',
  'analytics.income_expense',
  'analytics.cashflow',
  'analytics.advanced_charts'
)
ON CONFLICT (role_name, permission_object_id)
DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_edit = EXCLUDED.can_edit,
  can_create = EXCLUDED.can_create,
  can_delete = EXCLUDED.can_delete,
  updated_at = now();

COMMIT;
