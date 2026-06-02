
-- Clean up any existing conflicting accounts first
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com')
);
DELETE FROM public.profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com')
);
DELETE FROM auth.users WHERE email IN ('landlord2@openkey.com', 'landlord3@openkey.com', 'landlord4@openkey.com');

-- Create landlord2@openkey.com - Rebecca Martinez
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
        '{"first_name": "Rebecca", "last_name": "Martinez", "user_type": "landlord"}',
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
        'Rebecca',
        'Martinez',
        'landlord',
        'Martinez Property Solutions',
        '555-0201'
    );
END $$;

-- Create landlord3@openkey.com - David Chen  
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
        '{"first_name": "David", "last_name": "Chen", "user_type": "landlord"}',
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
        'David',
        'Chen',
        'landlord',
        'Chen Real Estate Holdings',
        '555-0301'
    );
END $$;

-- Create landlord4@openkey.com - Amanda Foster
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
        '{"first_name": "Amanda", "last_name": "Foster", "user_type": "landlord"}',
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
        'Amanda',
        'Foster',
        'landlord',
        'Foster Investment Group',
        '555-0401'
    );
END $$;
