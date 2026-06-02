
-- Fix the user role assignment - remove incorrect entry and add correct one
DELETE FROM public.account_roles 
WHERE user_id = 'b7843bb0-64bd-4ff3-9392-b73c111832ce' 
AND role_name = 'owner';

-- Add the owner role to the correct current user (Demo Landlord)
INSERT INTO public.account_roles (user_id, role_name, is_active, added_by)
VALUES (
  'ccb8536c-80d1-4834-9614-169b9a7caede', -- Current user ID from debug logs
  'owner',
  true,
  'ccb8536c-80d1-4834-9614-169b9a7caede'  -- Self-assigned initially
)
ON CONFLICT (user_id, role_name) DO UPDATE SET
  is_active = true,
  updated_at = now();
