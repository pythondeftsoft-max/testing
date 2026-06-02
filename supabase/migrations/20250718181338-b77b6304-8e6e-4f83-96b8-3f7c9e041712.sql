-- First completely clean up any existing data
DELETE FROM public.user_points WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com')
);
DELETE FROM public.profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com')
);
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com')
);
DELETE FROM auth.users WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com');

-- Now create the accounts fresh
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES 
(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'landlord2@openkey.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"first_name": "Rebecca", "last_name": "Martinez", "user_type": "landlord"}',
    now(),
    now()
),
(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'landlord3@openkey.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"first_name": "David", "last_name": "Chen", "user_type": "landlord"}',
    now(),
    now()
),
(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'landlord4@openkey.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"first_name": "Amanda", "last_name": "Foster", "user_type": "landlord"}',
    now(),
    now()
);

-- Create identities for each user
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    u.id,
    u.id::text,
    format('{"sub": "%s", "email": "%s"}', u.id::text, u.email)::jsonb,
    'email',
    now(),
    now()
FROM auth.users u 
WHERE u.email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com');

-- Create profiles for each user
INSERT INTO public.profiles (id, first_name, last_name, user_type, company_name, phone)
SELECT 
    u.id,
    CASE u.email
        WHEN 'landlord2@openkey.com' THEN 'Rebecca'
        WHEN 'landlord3@openkey.com' THEN 'David'
        WHEN 'landlord4@openkey.com' THEN 'Amanda'
    END,
    CASE u.email
        WHEN 'landlord2@openkey.com' THEN 'Martinez'
        WHEN 'landlord3@openkey.com' THEN 'Chen'
        WHEN 'landlord4@openkey.com' THEN 'Foster'
    END,
    'landlord',
    CASE u.email
        WHEN 'landlord2@openkey.com' THEN 'Martinez Property Solutions'
        WHEN 'landlord3@openkey.com' THEN 'Chen Real Estate Holdings'
        WHEN 'landlord4@openkey.com' THEN 'Foster Investment Group'
    END,
    CASE u.email
        WHEN 'landlord2@openkey.com' THEN '555-0201'
        WHEN 'landlord3@openkey.com' THEN '555-0301'
        WHEN 'landlord4@openkey.com' THEN '555-0401'
    END
FROM auth.users u 
WHERE u.email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com');

-- Verify creation
SELECT email, email_confirmed_at IS NOT NULL as email_confirmed, created_at
FROM auth.users 
WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com')
ORDER BY email;