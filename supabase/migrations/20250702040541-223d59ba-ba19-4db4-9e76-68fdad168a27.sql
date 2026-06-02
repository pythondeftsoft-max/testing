
-- First, let's clean up any existing broken tenant account
DELETE FROM auth.users WHERE email = 'tenant@openkey.com';

-- We also need to clean up the profiles table
DELETE FROM public.profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'
);

-- Now let's use Supabase's auth signup function to properly create the account
-- This uses the built-in auth.signup function which handles password hashing correctly
SELECT auth.signup(
  email => 'tenant@openkey.com',
  password => 'demo123',
  user_metadata => '{
    "first_name": "Demo",
    "last_name": "Tenant", 
    "user_type": "tenant"
  }'::jsonb,
  email_confirm => true
);
