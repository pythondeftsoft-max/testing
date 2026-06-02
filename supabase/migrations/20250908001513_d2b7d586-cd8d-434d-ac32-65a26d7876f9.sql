-- Add missing analytics permission objects
INSERT INTO public.permission_objects (name, display_name, category, description, scope) VALUES
('analytics.dashboard', 'Analytics Dashboard', 'Analytics', 'Access to main analytics dashboard', 'portfolio'),
('analytics.portfolio_trends', 'Portfolio Trends', 'Analytics', 'View portfolio trend analytics', 'portfolio'),
('analytics.asset_allocation', 'Asset Allocation', 'Analytics', 'View asset allocation analytics', 'portfolio'),
('analytics.income_expense', 'Income & Expense', 'Analytics', 'View income and expense analytics', 'portfolio'),
('analytics.cashflow', 'Cash Flow', 'Analytics', 'View cash flow analytics', 'portfolio'),
('analytics.advanced_charts', 'Advanced Charts', 'Analytics', 'Access to advanced chart analytics', 'portfolio')
ON CONFLICT (name, scope) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description;

-- Grant analytics permissions to admin_partner and editor roles
WITH analytics_objects AS (
  SELECT id, name FROM public.permission_objects 
  WHERE name LIKE 'analytics.%' AND scope = 'portfolio'
),
roles_to_grant AS (
  SELECT unnest(ARRAY['admin_partner', 'editor', 'viewer']) as role_name
)
INSERT INTO public.portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  rtg.role_name::portfolio_role_type,
  ao.id,
  true as can_view,
  CASE WHEN rtg.role_name IN ('admin_partner', 'editor') THEN true ELSE false END as can_edit,
  CASE WHEN rtg.role_name = 'admin_partner' THEN true ELSE false END as can_delete,
  CASE WHEN rtg.role_name IN ('admin_partner', 'editor') THEN true ELSE false END as can_create
FROM roles_to_grant rtg
CROSS JOIN analytics_objects ao
ON CONFLICT (role_name, permission_object_id) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete,
  can_create = EXCLUDED.can_create;