
-- Initialize the demo landlord user with owner role
INSERT INTO public.account_roles (user_id, role_name, is_active, added_by)
VALUES (
  'b7843bb0-64bd-4ff3-9392-b73c111832ce', -- Demo landlord user ID
  'owner',
  true,
  'b7843bb0-64bd-4ff3-9392-b73c111832ce'  -- Self-assigned initially
)
ON CONFLICT (user_id, role_name) DO NOTHING;
