
-- Create 3 test landlord accounts with a simpler approach
-- Clean up any existing attempts first
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com')
);
DELETE FROM public.profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com')
);
DELETE FROM auth.users WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com');

-- Create landlord2@openkey.com - Sarah Johnson
DO $$
DECLARE
    user_id uuid := gen_random_uuid();
BEGIN
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
        updated_at,
        confirmed_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        user_id,
        'authenticated',
        'authenticated',
        'landlord2@openkey.com',
        crypt('demo123', gen_salt('bf')),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"first_name": "Sarah", "last_name": "Johnson", "user_type": "landlord"}',
        now(),
        now(),
        now()
    );

    INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        user_id,
        user_id::text,
        format('{"sub": "%s", "email": "%s"}', user_id::text, 'landlord2@openkey.com')::jsonb,
        'email',
        now(),
        now()
    );

    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        user_type,
        company_name,
        phone
    ) VALUES (
        user_id,
        'Sarah',
        'Johnson',
        'landlord',
        'Sarah Properties',
        '555-0200'
    );
END $$;

-- Create landlord3@openkey.com - Michael Rodriguez  
DO $$
DECLARE
    user_id uuid := gen_random_uuid();
BEGIN
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
        updated_at,
        confirmed_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        user_id,
        'authenticated',
        'authenticated',
        'landlord3@openkey.com',
        crypt('demo123', gen_salt('bf')),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"first_name": "Michael", "last_name": "Rodriguez", "user_type": "landlord"}',
        now(),
        now(),
        now()
    );

    INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        user_id,
        user_id::text,
        format('{"sub": "%s", "email": "%s"}', user_id::text, 'landlord3@openkey.com')::jsonb,
        'email',
        now(),
        now()
    );

    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        user_type,
        company_name,
        phone
    ) VALUES (
        user_id,
        'Michael',
        'Rodriguez',
        'landlord',
        'Metro Rentals LLC',
        '555-0300'
    );
END $$;

-- Create landlord4@openkey.com - Emily Chen
DO $$
DECLARE
    user_id uuid := gen_random_uuid();
BEGIN
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
        updated_at,
        confirmed_at
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        user_id,
        'authenticated',
        'authenticated',
        'landlord4@openkey.com',
        crypt('demo123', gen_salt('bf')),
        now(),
        '{"provider": "email", "providers": ["email"]}',
        '{"first_name": "Emily", "last_name": "Chen", "user_type": "landlord"}',
        now(),
        now(),
        now()
    );

    INSERT INTO auth.identities (
        id,
        user_id,
        provider_id,
        identity_data,
        provider,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        user_id,
        user_id::text,
        format('{"sub": "%s", "email": "%s"}', user_id::text, 'landlord4@openkey.com')::jsonb,
        'email',
        now(),
        now()
    );

    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        user_type,
        company_name,
        phone
    ) VALUES (
        user_id,
        'Emily',
        'Chen',
        'landlord',
        'Downtown Holdings',
        '555-0400'
    );
END $$;
