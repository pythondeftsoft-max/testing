-- First, let's get the Test Portfolio 1 ID for reference
DO $$
DECLARE
    test_portfolio_id UUID := 'cfa63756-0823-4e39-a992-b3c18ea5a827';
    demo_landlord_id UUID;
    test_tenant_id UUID := '550e8400-e29b-41d4-a716-446655440001';
    property1_id UUID;
    property2_id UUID;
BEGIN
    -- Find the demo landlord account
    SELECT id INTO demo_landlord_id 
    FROM auth.users 
    WHERE email = 'landlord@openkey.com';
    
    -- Only proceed if demo landlord exists
    IF demo_landlord_id IS NOT NULL THEN
        -- Create test tenant profile if it doesn't exist
        INSERT INTO public.profiles (id, first_name, last_name, user_type)
        VALUES (test_tenant_id, 'Sarah', 'Johnson', 'tenant')
        ON CONFLICT (id) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            user_type = EXCLUDED.user_type;

        -- Create detailed tenant profile
        INSERT INTO public.tenant_profiles (
            user_id, monthly_income, credit_score, employment_status, 
            voucher_holder, has_pets, has_eviction, has_felonies,
            preferred_move_date, rent_range_min, rent_range_max,
            bedrooms_approved, preferred_locations, credit_score_range
        )
        VALUES (
            test_tenant_id, 4500, 750, 'employed',
            false, false, false, false,
            (CURRENT_DATE + INTERVAL '30 days')::DATE, 1500, 2000,
            ARRAY['2', '3'], ARRAY['Springfield', 'Champaign'], '700-750'
        )
        ON CONFLICT (user_id) DO UPDATE SET
            monthly_income = EXCLUDED.monthly_income,
            credit_score = EXCLUDED.credit_score,
            employment_status = EXCLUDED.employment_status,
            voucher_holder = EXCLUDED.voucher_holder,
            has_pets = EXCLUDED.has_pets,
            has_eviction = EXCLUDED.has_eviction,
            has_felonies = EXCLUDED.has_felonies,
            preferred_move_date = EXCLUDED.preferred_move_date,
            rent_range_min = EXCLUDED.rent_range_min,
            rent_range_max = EXCLUDED.rent_range_max,
            bedrooms_approved = EXCLUDED.bedrooms_approved,
            preferred_locations = EXCLUDED.preferred_locations,
            credit_score_range = EXCLUDED.credit_score_range;

        -- Insert test properties with proper portfolio assignment
        INSERT INTO public.properties (
            id, owner_id, portfolio_id, address, street_address, city, state, zipcode,
            unit_count, monthly_rent, status, insurance_cost, mortgage_cost, 
            management_fee, repair_costs, bedrooms, bathrooms, has_voucher, 
            voucher_type, description
        )
        VALUES 
        (
            gen_random_uuid(), demo_landlord_id, test_portfolio_id,
            '123 Main Street, Springfield, IL 62701', '123 Main Street', 'Springfield', 'IL', '62701',
            1, 1200.00, 'occupied', 150.00, 800.00, 120.00, 50.00, 2, 1.0, true,
            'section8', 'Cozy 2-bedroom apartment with Section 8 voucher'
        ),
        (
            gen_random_uuid(), demo_landlord_id, test_portfolio_id,
            '456 Oak Avenue, Springfield, IL 62702', '456 Oak Avenue', 'Springfield', 'IL', '62702',
            1, 1800.00, 'vacant', 200.00, 1200.00, 180.00, 100.00, 3, 2.0, false,
            NULL, 'Spacious 3-bedroom unit'
        )
        ON CONFLICT (owner_id, address) DO UPDATE SET
            portfolio_id = EXCLUDED.portfolio_id,
            monthly_rent = EXCLUDED.monthly_rent,
            status = EXCLUDED.status,
            insurance_cost = EXCLUDED.insurance_cost,
            mortgage_cost = EXCLUDED.mortgage_cost,
            management_fee = EXCLUDED.management_fee,
            repair_costs = EXCLUDED.repair_costs,
            bedrooms = EXCLUDED.bedrooms,
            bathrooms = EXCLUDED.bathrooms,
            has_voucher = EXCLUDED.has_voucher,
            voucher_type = EXCLUDED.voucher_type,
            description = EXCLUDED.description;

        -- Get the vacant property ID for creating applications
        SELECT id INTO property2_id
        FROM public.properties 
        WHERE owner_id = demo_landlord_id 
        AND address = '456 Oak Avenue, Springfield, IL 62702';

        -- Create test application for vacant property
        IF property2_id IS NOT NULL THEN
            INSERT INTO public.property_applications (
                property_id, tenant_id, status, priority_payment_made, tenant_score
            )
            VALUES (property2_id, test_tenant_id, 'pending', true, 8)
            ON CONFLICT (property_id, tenant_id) DO UPDATE SET
                status = EXCLUDED.status,
                priority_payment_made = EXCLUDED.priority_payment_made,
                tenant_score = EXCLUDED.tenant_score;

            -- Update property to show it has tenant requests
            UPDATE public.properties 
            SET tenant_request_count = 1, 
                desired_rent = monthly_rent 
            WHERE id = property2_id;
        END IF;

        -- Update any existing properties without portfolio_id to be assigned to Test Portfolio 1
        UPDATE public.properties 
        SET portfolio_id = test_portfolio_id
        WHERE owner_id = demo_landlord_id 
        AND portfolio_id IS NULL;

        RAISE NOTICE 'Test data created/updated successfully for Test Portfolio 1';
    ELSE
        RAISE NOTICE 'Demo landlord account not found, skipping test data creation';
    END IF;
END $$;