-- Fix 1: Grant proper permissions to the functions
GRANT EXECUTE ON FUNCTION public.get_portfolio_effective_permissions(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_portfolio_permission(uuid, uuid, text, text) TO authenticated;

-- Fix 2: Ensure the user has proper account role
INSERT INTO public.account_roles (user_id, role_name, is_active, added_by)
SELECT auth.uid(), 'owner'::account_role_type, true, auth.uid()
WHERE NOT EXISTS (
  SELECT 1 FROM public.account_roles 
  WHERE user_id = auth.uid() AND role_name = 'owner'::account_role_type AND is_active = true
);

-- Fix 3: Seed default portfolio role permissions for all roles
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