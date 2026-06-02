
-- Clean up any existing broken tenant account first
DELETE FROM public.profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'
);
DELETE FROM auth.users WHERE email = 'tenant@openkey.com';

-- Create the demo tenant user using a direct insert approach that works with Supabase
-- We'll use the same approach as the existing demo accounts but ensure proper password hashing
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  email_change_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  confirmed_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'tenant@openkey.com',
  crypt('demo123', gen_salt('bf')),
  now(),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Demo", "last_name": "Tenant", "user_type": "tenant"}',
  false,
  now(),
  now(),
  null,
  null,
  '',
  '',
  null,
  now(),
  '',
  0,
  null,
  '',
  null,
  false,
  null
);
