-- Force clean up all data related to these accounts
DELETE FROM public.user_points WHERE user_id IN (
    SELECT p.id FROM public.profiles p 
    WHERE p.company_name LIKE '%Martinez%' 
       OR p.company_name LIKE '%Chen%' 
       OR p.company_name LIKE '%Foster%'
       OR p.id IN (SELECT id FROM auth.users WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com'))
);

DELETE FROM public.profiles WHERE 
    company_name LIKE '%Martinez%' 
    OR company_name LIKE '%Chen%' 
    OR company_name LIKE '%Foster%'
    OR id IN (SELECT id FROM auth.users WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com'));

DELETE FROM auth.identities WHERE user_id IN (
    SELECT id FROM auth.users WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com')
);

DELETE FROM auth.users WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com');

-- Create the three test accounts using separate transactions to avoid conflicts
-- landlord2@openkey.com - Rebecca Martinez
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated', 
    'landlord2@openkey.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"first_name": "Rebecca", "last_name": "Martinez", "user_type": "landlord"}',
    now(),
    now()
);

-- landlord3@openkey.com - David Chen  
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'landlord3@openkey.com',
    crypt('demo123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"first_name": "David", "last_name": "Chen", "user_type": "landlord"}',
    now(),
    now()
);

-- landlord4@openkey.com - Amanda Foster
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
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

-- Create identities
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111110', '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub": "11111111-1111-1111-1111-111111111111", "email": "landlord2@openkey.com"}', 'email', now(), now()),
('22222222-2222-2222-2222-222222222220', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub": "22222222-2222-2222-2222-222222222222", "email": "landlord3@openkey.com"}', 'email', now(), now()),
('33333333-3333-3333-3333-333333333330', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '{"sub": "33333333-3333-3333-3333-333333333333", "email": "landlord4@openkey.com"}', 'email', now(), now());

-- Create profiles
INSERT INTO public.profiles (id, first_name, last_name, user_type, company_name, phone) VALUES
('11111111-1111-1111-1111-111111111111', 'Rebecca', 'Martinez', 'landlord', 'Martinez Property Solutions', '555-0201'),
('22222222-2222-2222-2222-222222222222', 'David', 'Chen', 'landlord', 'Chen Real Estate Holdings', '555-0301'),
('33333333-3333-3333-3333-333333333333', 'Amanda', 'Foster', 'landlord', 'Foster Investment Group', '555-0401');

-- Verify all accounts
SELECT email, email_confirmed_at IS NOT NULL as confirmed, created_at
FROM auth.users 
WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com')
ORDER BY email;