-- Fix function permissions and ensure proper access
REVOKE ALL ON FUNCTION public.get_portfolio_effective_permissions(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_portfolio_effective_permissions(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.has_portfolio_permission(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_portfolio_permission(uuid, uuid, text, text) TO authenticated;

-- Seed default portfolio role permissions for all portfolio-scoped objects
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