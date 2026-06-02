
-- First, let's make sure we have proper demo data for the admin to oversee
-- Create some additional demo landlords and properties for better admin overview

-- Insert additional demo landlord
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
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
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
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Sarah", "last_name": "Johnson", "user_type": "landlord"}',
  false
) ON CONFLICT (email) DO NOTHING;

-- Get the landlord2 user ID
DO $$
DECLARE
    landlord2_id uuid;
    tenant_id uuid;
BEGIN
    -- Get landlord2 ID
    SELECT id INTO landlord2_id FROM auth.users WHERE email = 'landlord2@openkey.com';
    
    -- Get tenant demo ID
    SELECT id INTO tenant_id FROM auth.users WHERE email = 'tenant@openkey.com';
    
    -- Create profile for landlord2 if it doesn't exist
    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        user_type,
        created_at,
        updated_at
    ) VALUES (
        landlord2_id,
        'Sarah',
        'Johnson',
        'landlord',
        now(),
        now()
    ) ON CONFLICT (id) DO NOTHING;
    
    -- Add more properties for landlord2
    INSERT INTO public.properties (
        owner_id,
        address,
        unit_count,
        monthly_rent,
        status,
        bedrooms,
        bathrooms,
        zipcode,
        description,
        lease_start_date,
        lease_end_date,
        rent_due_day
    ) VALUES (
        landlord2_id,
        '789 Pine Street, Chicago, IL 60601',
        1,
        1500.00,
        'occupied',
        2,
        1.0,
        '60601',
        'Modern downtown apartment',
        '2024-01-01',
        '2024-12-31',
        5
    ),
    (
        landlord2_id,
        '321 Cedar Ave, Chicago, IL 60602',
        3,
        2200.00,
        'vacant',
        3,
        2.0,
        '60602',
        'Spacious family home',
        null,
        null,
        1
    ) ON CONFLICT DO NOTHING;
    
    -- Create some tenant applications for better admin oversight
    IF tenant_id IS NOT NULL THEN
        INSERT INTO public.property_applications (
            tenant_id,
            property_id,
            status,
            priority_payment_made,
            created_at
        )
        SELECT 
            tenant_id,
            p.id,
            'pending',
            true,
            now() - interval '2 days'
        FROM public.properties p
        WHERE p.owner_id = landlord2_id
        LIMIT 1
        ON CONFLICT DO NOTHING;
    END IF;
    
    -- Update tenant profile with more complete information for admin viewing
    UPDATE public.tenant_profiles 
    SET 
        voucher_holder = true,
        voucher_amount = 1200,
        monthly_income = 3000,
        max_rent = 1400,
        credit_score = 680,
        employment_status = 'Full-time',
        city = 'Chicago',
        zip_code = '60601',
        phone_type = 'mobile',
        updated_at = now()
    WHERE user_id = tenant_id;
    
END $$;

-- Create some additional demo tenant profiles for admin to see
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
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'tenant2@openkey.com',
  crypt('demo123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider": "email", "providers": ["email"]}',
  '{"first_name": "Michael", "last_name": "Brown", "user_type": "tenant"}',
  false
) ON CONFLICT (email) DO NOTHING;

-- Set up the second demo tenant
DO $$
DECLARE
    tenant2_id uuid;
BEGIN
    SELECT id INTO tenant2_id FROM auth.users WHERE email = 'tenant2@openkey.com';
    
    -- Create profile for tenant2
    INSERT INTO public.profiles (
        id,
        first_name,
        last_name,
        user_type,
        phone,
        created_at,
        updated_at
    ) VALUES (
        tenant2_id,
        'Michael',
        'Brown',
        'tenant',
        '555-0987',
        now(),
        now()
    ) ON CONFLICT (id) DO NOTHING;
    
    -- Create tenant profile
    INSERT INTO public.tenant_profiles (
        user_id,
        voucher_holder,
        voucher_amount,
        monthly_income,
        max_rent,
        credit_score,
        employment_status,
        city,
        zip_code,
        phone_type,
        message_credits,
        is_plus_subscriber,
        created_at,
        updated_at
    ) VALUES (
        tenant2_id,
        false,
        0,
        2800,
        1300,
        720,
        'Part-time',
        'Chicago',
        '60602',
        'mobile',
        2,
        false,
        now(),
        now()
    ) ON CONFLICT (user_id) DO NOTHING;
    
END $$;

-- Add some notifications for admin to see platform activity
DO $$
DECLARE
    admin_id uuid;
    landlord_id uuid;
    tenant_id uuid;
BEGIN
    SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@openkey.com';
    SELECT id INTO landlord_id FROM auth.users WHERE email = 'landlord@openkey.com';
    SELECT id INTO tenant_id FROM auth.users WHERE email = 'tenant@openkey.com';
    
    -- Add notifications for admin monitoring
    INSERT INTO public.notifications (
        user_id,
        title,
        description,
        type,
        read,
        created_at
    ) VALUES (
        admin_id,
        'New Tenant Application',
        'A new tenant application has been submitted for review.',
        'application',
        false,
        now() - interval '1 hour'
    ),
    (
        admin_id,
        'Property Listed',
        'New property has been added to the platform.',
        'property',
        false,
        now() - interval '3 hours'
    ),
    (
        admin_id,
        'Payment Processing',
        'Monthly rent payments are being processed.',
        'payment',
        true,
        now() - interval '1 day'
    ) ON CONFLICT DO NOTHING;
    
END $$;
