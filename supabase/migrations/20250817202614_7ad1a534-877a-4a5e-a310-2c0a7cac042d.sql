
BEGIN;

-- 1) Align helper functions to use permission_objects.name (matches current code/types)

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

  -- If no specific portfolio provided, allow account owners/admin partners
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
  WHERE po.name = p_object
    AND po.scope = 'portfolio';

  RETURN COALESCE(v_allowed, false);
END;
$$;

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
    po.name AS object_name,
    po.display_name,
    po.category,
    COALESCE(po.description, '')::text AS description,
    COALESCE(prp.can_view, false)   AS can_view,
    COALESCE(prp.can_edit, false)   AS can_edit,
    COALESCE(prp.can_create, false) AS can_create,
    COALESCE(prp.can_delete, false) AS can_delete
  FROM public.permission_objects po
  LEFT JOIN public.portfolio_role_permissions prp
    ON prp.permission_object_id = po.id
   AND prp.role_name = p_role
  WHERE po.scope = 'portfolio'
  ORDER BY po.category, po.display_name;
$$;

-- 2) Add portfolio-scoped permission objects (idempotent)

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.properties', 'Properties', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.properties');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.assets', 'Assets', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.assets');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.assets.valuations', 'Asset Valuations', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.assets.valuations');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.assets.documents', 'Asset Documents', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.assets.documents');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.documents', 'Portfolio Documents', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.documents');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.maintenance', 'Maintenance', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.maintenance');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.maintenance.vendors', 'Maintenance Vendors', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.maintenance.vendors');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.tenants', 'Tenants', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.tenants');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.communications', 'Tenant Communications', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.communications');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.payments', 'Payments', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.payments');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.budgeting', 'Budgets', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.budgeting');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.security_deposits', 'Security Deposits', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.security_deposits');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.invites', 'Invitations', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.invites');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.roles', 'Portfolio Roles', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.roles');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.permissions', 'Portfolio Permissions', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.permissions');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.reports.export', 'Reports Export', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.reports.export');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.sharing', 'Sharing', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.sharing');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.tax.1099', 'Tax 1099', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.tax.1099');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.tax.iris', 'IRS IRIS', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.tax.iris');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.value_snapshots', 'Value Snapshots', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.value_snapshots');

INSERT INTO public.permission_objects (name, display_name, category, scope)
SELECT 'portfolio.alerts', 'Alerts', 'portfolio', 'portfolio'
WHERE NOT EXISTS (SELECT 1 FROM public.permission_objects WHERE name = 'portfolio.alerts');

-- 3) Seed defaults: viewer (read-only for operational areas)

INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view)
SELECT 'viewer'::public.portfolio_role_type, po.id, true
FROM public.permission_objects po
WHERE po.scope = 'portfolio'
  AND po.name IN (
    'portfolio.properties',
    'portfolio.assets',
    'portfolio.assets.valuations',
    'portfolio.assets.documents',
    'portfolio.documents',
    'portfolio.maintenance',
    'portfolio.maintenance.vendors',
    'portfolio.tenants',
    'portfolio.communications',
    'portfolio.payments',
    'portfolio.budgeting',
    'portfolio.security_deposits',
    'portfolio.value_snapshots',
    'portfolio.alerts',
    'portfolio.tax.1099',
    'portfolio.tax.iris',
    'portfolio.reports.export'
  )
ON CONFLICT (role_name, permission_object_id)
DO UPDATE SET can_view = EXCLUDED.can_view, updated_at = now();

-- 4) Seed defaults: editor (view + create/edit on day-to-day ops; delete left false by default)

INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_create, can_delete)
SELECT 'editor'::public.portfolio_role_type, po.id, true, true, true, false
FROM public.permission_objects po
WHERE po.scope = 'portfolio'
  AND po.name IN (
    'portfolio.assets',
    'portfolio.assets.valuations',
    'portfolio.assets.documents',
    'portfolio.documents',
    'portfolio.maintenance',
    'portfolio.maintenance.vendors',
    'portfolio.tenants',
    'portfolio.communications',
    'portfolio.budgeting',
    'portfolio.security_deposits'
  )
ON CONFLICT (role_name, permission_object_id)
DO UPDATE SET
  can_view   = EXCLUDED.can_view,
  can_edit   = EXCLUDED.can_edit,
  can_create = EXCLUDED.can_create,
  can_delete = EXCLUDED.can_delete,
  updated_at = now();

-- Ensure editor still has view access for other read-only areas
INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view)
SELECT 'editor'::public.portfolio_role_type, po.id, true
FROM public.permission_objects po
WHERE po.scope = 'portfolio'
  AND po.name IN (
    'portfolio.properties',
    'portfolio.payments',
    'portfolio.value_snapshots',
    'portfolio.alerts',
    'portfolio.tax.1099',
    'portfolio.tax.iris',
    'portfolio.reports.export'
  )
ON CONFLICT (role_name, permission_object_id)
DO UPDATE SET can_view = true, updated_at = now();

-- 5) Seed defaults: admin_partner (full access across all new objects)

INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_create, can_delete)
SELECT 'admin_partner'::public.portfolio_role_type, po.id, true, true, true, true
FROM public.permission_objects po
WHERE po.scope = 'portfolio'
  AND po.name IN (
    'portfolio.properties',
    'portfolio.assets',
    'portfolio.assets.valuations',
    'portfolio.assets.documents',
    'portfolio.documents',
    'portfolio.maintenance',
    'portfolio.maintenance.vendors',
    'portfolio.tenants',
    'portfolio.communications',
    'portfolio.payments',
    'portfolio.budgeting',
    'portfolio.security_deposits',
    'portfolio.invites',
    'portfolio.roles',
    'portfolio.permissions',
    'portfolio.reports.export',
    'portfolio.sharing',
    'portfolio.tax.1099',
    'portfolio.tax.iris',
    'portfolio.value_snapshots',
    'portfolio.alerts'
  )
ON CONFLICT (role_name, permission_object_id)
DO UPDATE SET
  can_view   = EXCLUDED.can_view,
  can_edit   = EXCLUDED.can_edit,
  can_create = EXCLUDED.can_create,
  can_delete = EXCLUDED.can_delete,
  updated_at = now();

COMMIT;
