-- Clean up duplicate test data and add security constraints for user creation

-- Update profiles to match their corresponding auth.users data
UPDATE public.profiles 
SET 
    first_name = COALESCE(au.raw_user_meta_data ->> 'first_name', profiles.first_name),
    last_name = COALESCE(au.raw_user_meta_data ->> 'last_name', profiles.last_name),
    company_name = COALESCE(au.raw_user_meta_data ->> 'company_name', profiles.company_name),
    phone = COALESCE(au.raw_user_meta_data ->> 'phone', profiles.phone),
    user_type = COALESCE((au.raw_user_meta_data ->> 'user_type')::public.user_type, profiles.user_type)
FROM auth.users au 
WHERE profiles.id = au.id;

-- Delete orphaned profiles (profiles without corresponding auth.users)
DELETE FROM public.profiles 
WHERE id NOT IN (SELECT id FROM auth.users);

-- Update handle_new_user function to use actual auth user data and prevent conflicts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    profile_exists BOOLEAN;
BEGIN
    -- Check if profile already exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = NEW.id) INTO profile_exists;
    
    -- Only insert if profile doesn't exist
    IF NOT profile_exists THEN
        INSERT INTO public.profiles (
            id, 
            first_name, 
            last_name, 
            user_type, 
            company_name, 
            phone
        )
        VALUES (
            NEW.id,
            NEW.raw_user_meta_data ->> 'first_name',
            NEW.raw_user_meta_data ->> 'last_name',
            COALESCE((NEW.raw_user_meta_data ->> 'user_type')::public.user_type, 'individual_owner'),
            NEW.raw_user_meta_data ->> 'company_name',
            NEW.raw_user_meta_data ->> 'phone'
        );

        -- Create tenant profile if user type is tenant
        IF COALESCE((NEW.raw_user_meta_data ->> 'user_type')::public.user_type, 'individual_owner') = 'tenant' THEN
            INSERT INTO public.tenant_profiles (user_id) VALUES (NEW.id)
            ON CONFLICT (user_id) DO NOTHING;
        ELSIF COALESCE((NEW.raw_user_meta_data ->> 'user_type')::public.user_type, 'individual_owner') = 'individual_owner' THEN
            INSERT INTO public.tenant_profiles (user_id) VALUES (NEW.id)
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    END IF;

    -- Demo data creation for existing demo accounts (only if email matches exactly)
    IF NEW.email = 'landlord@openkey.com' AND NOT EXISTS(SELECT 1 FROM public.properties WHERE owner_id = NEW.id) THEN
        INSERT INTO public.properties (
            owner_id, address, unit_count, monthly_rent, status,
            insurance_cost, mortgage_cost, management_fee, repair_costs,
            bedrooms, bathrooms, zipcode, description
        ) VALUES (
            NEW.id, '123 Main Street, Springfield, IL 62701', 1, 1200.00, 'occupied',
            150.00, 800.00, 120.00, 50.00, 2, 1.0, '62701', 'Cozy 2-bedroom apartment'
        ),
        (
            NEW.id, '456 Oak Avenue, Springfield, IL 62702', 2, 1800.00, 'vacant',
            200.00, 1200.00, 180.00, 100.00, 3, 2.0, '62702', 'Spacious 3-bedroom unit'
        );
    END IF;

    -- Add demo tenant account applications
    IF NEW.email = 'tenant@openkey.com' AND NOT EXISTS(SELECT 1 FROM public.property_applications WHERE tenant_id = NEW.id) THEN
        INSERT INTO public.property_applications (tenant_id, property_id, status, priority_payment_made)
        SELECT NEW.id, p.id, 'pending', true
        FROM public.properties p
        LIMIT 2;
    END IF;

    -- Add demo admin tenant applications
    IF NEW.email = 'admin@openkey.com' AND NOT EXISTS(SELECT 1 FROM public.tenant_applications WHERE email = 'john.smith@email.com') THEN
        INSERT INTO public.tenant_applications (
            name, email, phone, state, has_voucher, voucher_amount, status, priority_payment_made
        ) VALUES (
            'John Smith', 'john.smith@email.com', '555-1234', 'Illinois',
            true, 1100.00, 'pending', true
        ),
        (
            'Maria Garcia', 'maria.garcia@email.com', '555-5678', 'Illinois',
            true, 950.00, 'approved', false
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Add unique constraint on tenant_profiles.user_id to prevent duplicates
ALTER TABLE public.tenant_profiles 
ADD CONSTRAINT tenant_profiles_user_id_unique UNIQUE (user_id);

-- Create a function to safely get user email from auth.users for display
CREATE OR REPLACE FUNCTION public.get_user_email(user_id uuid)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT email FROM auth.users WHERE id = user_id;
$$;

-- Create a function for admins to get user directory data
CREATE OR REPLACE FUNCTION public.get_admin_user_directory()
RETURNS TABLE (
    id uuid,
    first_name text,
    last_name text,
    user_type public.user_type,
    company_name text,
    phone text,
    created_at timestamptz,
    updated_at timestamptz,
    email text,
    last_sign_in_at timestamptz,
    status text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        p.id,
        p.first_name,
        p.last_name,
        p.user_type,
        p.company_name,
        p.phone,
        p.created_at,
        p.updated_at,
        au.email,
        au.last_sign_in_at,
        CASE 
            WHEN au.email_confirmed_at IS NOT NULL THEN 'active'
            WHEN au.email_confirmed_at IS NULL THEN 'invited'
            ELSE 'suspended'
        END::text as status
    FROM public.profiles p
    JOIN auth.users au ON p.id = au.id
    ORDER BY p.created_at DESC;
$$;

-- Add email validation function for user registration
CREATE OR REPLACE FUNCTION public.validate_user_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate email format
    IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
    
    -- Prevent duplicate emails (case insensitive)
    IF EXISTS (
        SELECT 1 FROM auth.users 
        WHERE LOWER(email) = LOWER(NEW.email) 
        AND id != NEW.id
    ) THEN
        RAISE EXCEPTION 'Email already exists: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Add trigger to validate user registration
DROP TRIGGER IF EXISTS validate_user_registration_trigger ON auth.users;
CREATE TRIGGER validate_user_registration_trigger
    BEFORE INSERT OR UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_user_registration();