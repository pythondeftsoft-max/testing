
-- Insert demo tenant user directly into auth.users table
-- This creates the actual user account that can be used for login
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
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
  '{"first_name": "Demo", "last_name": "Tenant", "user_type": "tenant"}',
  false,
  '',
  '',
  '',
  ''
) ON CONFLICT (email) DO NOTHING;
