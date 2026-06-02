
-- First, let's check if the tenant user exists and clean up if needed
DELETE FROM public.tenant_profiles WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'
);
DELETE FROM public.profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'
);
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'
);
DELETE FROM auth.users WHERE email = 'tenant@openkey.com';

-- Create tenant user using a simpler approach that mirrors the working accounts
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
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
  null,
  '',
  null,
  '',
  null,
  '',
  '',
  null,
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

-- Get the user ID that was just created
DO $$
DECLARE
    new_user_id uuid;
BEGIN
    SELECT id INTO new_user_id FROM auth.users WHERE email = 'tenant@openkey.com';
    
    -- Insert identity record
    INSERT INTO auth.identities (
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at,
        id
    ) VALUES (
        new_user_id::text,
        new_user_id,
        format('{"sub": "%s", "email": "%s", "email_verified": %s, "phone_verified": %s}', 
               new_user_id::text, 'tenant@openkey.com', 'true', 'false')::jsonb,
        'email',
        now(),
        now(),
        now(),
        gen_random_uuid()
    );
    
    -- Create profile (the trigger should handle this, but let's ensure it exists)
    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        user_type,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        'Demo',
        'Tenant',
        'tenant',
        now(),
        now()
    ) ON CONFLICT (id) DO NOTHING;
    
    -- Create tenant profile
    INSERT INTO public.tenant_profiles (
        user_id,
        created_at,
        updated_at
    ) VALUES (
        new_user_id,
        now(),
        now()
    ) ON CONFLICT (user_id) DO NOTHING;
    
END $$;
