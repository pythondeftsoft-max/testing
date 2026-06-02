
-- Fix the tenant demo user's profile to have correct user_type
UPDATE public.profiles 
SET user_type = 'tenant', 
    first_name = 'Demo', 
    last_name = 'Tenant',
    updated_at = now()
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'
);

-- Ensure tenant profile exists for the demo tenant user
INSERT INTO public.tenant_profiles (user_id, message_credits, is_plus_subscriber)
SELECT id, 5, false
FROM auth.users 
WHERE email = 'tenant@openkey.com'
ON CONFLICT (user_id) DO UPDATE SET
  message_credits = GREATEST(tenant_profiles.message_credits, 5),
  updated_at = now();
