
-- Clean up any existing tenant account completely
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

-- Create tenant user with exact same approach as working accounts
DO $$
DECLARE
    tenant_user_id uuid := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid;
BEGIN
    -- Insert into auth.users with all required fields
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
        tenant_user_id,
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

    -- Insert into auth.identities
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
        tenant_user_id::text,
        tenant_user_id,
        format('{"sub": "%s", "email": "%s", "email_verified": %s, "phone_verified": %s}', 
               tenant_user_id::text, 'tenant@openkey.com', 'true', 'false')::jsonb,
        'email',
        now(),
        now(),
        now(),
        gen_random_uuid()
    );

    -- Manually create profile (in case trigger doesn't fire)
    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        user_type,
        created_at,
        updated_at
    ) VALUES (
        tenant_user_id,
        'Demo',
        'Tenant',
        'tenant',
        now(),
        now()
    );

    -- Manually create tenant profile
    INSERT INTO public.tenant_profiles (
        user_id,
        created_at,
        updated_at
    ) VALUES (
        tenant_user_id,
        now(),
        now()
    );

END $$;
