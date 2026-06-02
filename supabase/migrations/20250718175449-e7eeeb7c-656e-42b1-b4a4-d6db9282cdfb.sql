
-- Create 3 additional test landlord accounts for RBAC testing

-- Landlord 2: Sarah Properties
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
  'landlord2@openkey.com',
  crypt('demo123', gen_salt('bf')),
  now(),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Sarah", "last_name": "Johnson", "user_type": "landlord", "company_name": "Sarah Properties", "phone": "555-0200"}',
  false,
  now(),
  now(),
  '555-0200',
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

-- Landlord 3: Metro Rentals LLC
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
  'landlord3@openkey.com',
  crypt('demo123', gen_salt('bf')),
  now(),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Michael", "last_name": "Rodriguez", "user_type": "landlord", "company_name": "Metro Rentals LLC", "phone": "555-0300"}',
  false,
  now(),
  now(),
  '555-0300',
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

-- Landlord 4: Downtown Holdings
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
  'landlord4@openkey.com',
  crypt('demo123', gen_salt('bf')),
  now(),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Emily", "last_name": "Chen", "user_type": "landlord", "company_name": "Downtown Holdings", "phone": "555-0400"}',
  false,
  now(),
  now(),
  '555-0400',
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

-- Create identity records for each new landlord
DO $$
DECLARE
    landlord2_id uuid;
    landlord3_id uuid;
    landlord4_id uuid;
BEGIN
    -- Get the user IDs
    SELECT id INTO landlord2_id FROM auth.users WHERE email = 'landlord2@openkey.com';
    SELECT id INTO landlord3_id FROM auth.users WHERE email = 'landlord3@openkey.com';
    SELECT id INTO landlord4_id FROM auth.users WHERE email = 'landlord4@openkey.com';
    
    -- Insert identity records for landlord2
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
        landlord2_id::text,
        landlord2_id,
        format('{"sub": "%s", "email": "%s", "email_verified": %s, "phone_verified": %s}', 
               landlord2_id::text, 'landlord2@openkey.com', 'true', 'false')::jsonb,
        'email',
        now(),
        now(),
        now(),
        gen_random_uuid()
    );
    
    -- Insert identity records for landlord3
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
        landlord3_id::text,
        landlord3_id,
        format('{"sub": "%s", "email": "%s", "email_verified": %s, "phone_verified": %s}', 
               landlord3_id::text, 'landlord3@openkey.com', 'true', 'false')::jsonb,
        'email',
        now(),
        now(),
        now(),
        gen_random_uuid()
    );
    
    -- Insert identity records for landlord4
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
        landlord4_id::text,
        landlord4_id,
        format('{"sub": "%s", "email": "%s", "email_verified": %s, "phone_verified": %s}', 
               landlord4_id::text, 'landlord4@openkey.com', 'true', 'false')::jsonb,
        'email',
        now(),
        now(),
        now(),
        gen_random_uuid()
    );
    
    -- Create profiles for each landlord (the trigger should handle this, but let's ensure it exists)
    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        user_type,
        company_name,
        phone,
        created_at,
        updated_at
    ) VALUES (
        landlord2_id,
        'Sarah',
        'Johnson',
        'landlord',
        'Sarah Properties',
        '555-0200',
        now(),
        now()
    ) ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        user_type,
        company_name,
        phone,
        created_at,
        updated_at
    ) VALUES (
        landlord3_id,
        'Michael',
        'Rodriguez',
        'landlord',
        'Metro Rentals LLC',
        '555-0300',
        now(),
        now()
    ) ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        user_type,
        company_name,
        phone,
        created_at,
        updated_at
    ) VALUES (
        landlord4_id,
        'Emily',
        'Chen',
        'landlord',
        'Downtown Holdings',
        '555-0400',
        now(),
        now()
    ) ON CONFLICT (id) DO NOTHING;
END $$;
