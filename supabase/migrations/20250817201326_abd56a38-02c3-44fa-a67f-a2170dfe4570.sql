-- Seed initial account permissions for all account roles
INSERT INTO public.account_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'owner'::account_role_type,
  po.id,
  true, -- owners can view everything
  true, -- owners can edit everything
  true, -- owners can delete everything
  true  -- owners can create everything
FROM public.permission_objects po
WHERE po.scope = 'account'
ON CONFLICT (role_name, permission_object_id) DO NOTHING;

INSERT INTO public.account_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'admin_partner'::account_role_type,
  po.id,
  true, -- admin_partners can view most things
  CASE 
    WHEN po.name IN ('user_management', 'account_settings', 'billing') THEN true
    ELSE false
  END, -- admin_partners can edit specific objects
  false, -- admin_partners cannot delete by default
  CASE 
    WHEN po.name IN ('user_management') THEN true
    ELSE false
  END -- admin_partners can create users
FROM public.permission_objects po
WHERE po.scope = 'account'
ON CONFLICT (role_name, permission_object_id) DO NOTHING;

INSERT INTO public.account_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create)
SELECT 
  'support_assistant'::account_role_type,
  po.id,
  CASE 
    WHEN po.name IN ('user_management', 'system_logs') THEN true
    ELSE false
  END, -- support_assistants can view limited objects
  false, -- support_assistants cannot edit by default
  false, -- support_assistants cannot delete
  false  -- support_assistants cannot create by default
FROM public.permission_objects po
WHERE po.scope = 'account'
ON CONFLICT (role_name, permission_object_id) DO NOTHING;