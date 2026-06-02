-- Insert sample multi-unit properties and units for testing
-- First, let's add some multi-unit properties for the demo landlord

-- Get the demo landlord user ID
DO $$
DECLARE
    demo_landlord_id UUID;
BEGIN
    -- Get the landlord demo user ID
    SELECT id INTO demo_landlord_id FROM auth.users WHERE email = 'landlord@openkey.com';
    
    IF demo_landlord_id IS NOT NULL THEN
        -- Insert a 4-unit apartment building
        INSERT INTO public.properties (
            id, owner_id, address, unit_count, monthly_rent, status,
            city, state, zipcode, street_address,
            amenities, description, created_at
        ) VALUES (
            gen_random_uuid(),
            demo_landlord_id, 
            '789 Maple Heights, Springfield, IL 62703', 
            4, 
            1400.00, 
            'available',
            'Springfield', 
            'IL', 
            '62703',
            '789 Maple Heights',
            ARRAY['Parking', 'Laundry', 'Air Conditioning', 'Balcony'],
            'Modern 4-unit apartment building with great amenities',
            now()
        );

        -- Insert a 6-unit complex
        INSERT INTO public.properties (
            id, owner_id, address, unit_count, monthly_rent, status,
            city, state, zipcode, street_address,
            amenities, description, created_at
        ) VALUES (
            gen_random_uuid(),
            demo_landlord_id, 
            '456 Oakwood Court, Springfield, IL 62704', 
            6, 
            1600.00, 
            'available',
            'Springfield', 
            'IL', 
            '62704',
            '456 Oakwood Court',
            ARRAY['Pool', 'Gym', 'Parking', 'Pet Friendly', 'In-unit Washer/Dryer'],
            'Luxury 6-unit complex with premium amenities',
            now()
        );
    END IF;
END $$;

-- Now let's create varied units for the Maple Heights property
DO $$
DECLARE
    maple_property_id UUID;
    demo_tenant_id UUID;
BEGIN
    -- Get the property ID for Maple Heights
    SELECT id INTO maple_property_id FROM public.properties 
    WHERE street_address = '789 Maple Heights' 
    AND deleted_at IS NULL 
    LIMIT 1;
    
    -- Get a demo tenant ID
    SELECT id INTO demo_tenant_id FROM auth.users WHERE email = 'tenant@openkey.com';
    
    IF maple_property_id IS NOT NULL THEN
        -- Clear any existing units for this property to avoid duplicates
        DELETE FROM public.property_units WHERE property_id = maple_property_id;
        
        -- Unit 1A - Occupied
        INSERT INTO public.property_units (
            property_id, unit_number, unit_name, monthly_rent, 
            bedrooms, bathrooms, square_feet, status, tenant_id,
            lease_start_date, lease_end_date, floor_number,
            unit_amenities, description
        ) VALUES (
            maple_property_id, '1A', '789 Maple Heights - Unit 1A', 1350.00,
            2, 1.5, 900, 'occupied', demo_tenant_id,
            '2024-01-01', '2024-12-31', 1,
            ARRAY['Balcony', 'Air Conditioning'],
            'Cozy 2-bedroom unit with private balcony'
        );
        
        -- Unit 1B - Available
        INSERT INTO public.property_units (
            property_id, unit_number, unit_name, monthly_rent, 
            bedrooms, bathrooms, square_feet, status,
            floor_number, unit_amenities, description
        ) VALUES (
            maple_property_id, '1B', '789 Maple Heights - Unit 1B', 1300.00,
            1, 1, 750, 'available',
            1, ARRAY['Air Conditioning', 'Parking'],
            'Bright 1-bedroom unit with dedicated parking'
        );
        
        -- Unit 2A - Available
        INSERT INTO public.property_units (
            property_id, unit_number, unit_name, monthly_rent, 
            bedrooms, bathrooms, square_feet, status,
            floor_number, unit_amenities, description
        ) VALUES (
            maple_property_id, '2A', '789 Maple Heights - Unit 2A', 1450.00,
            2, 2, 1000, 'available',
            2, ARRAY['Balcony', 'Air Conditioning', 'In-unit Laundry'],
            'Spacious 2-bedroom, 2-bath unit with washer/dryer'
        );
        
        -- Unit 2B - Maintenance
        INSERT INTO public.property_units (
            property_id, unit_number, unit_name, monthly_rent, 
            bedrooms, bathrooms, square_feet, status,
            floor_number, unit_amenities, description
        ) VALUES (
            maple_property_id, '2B', '789 Maple Heights - Unit 2B', 1400.00,
            2, 1.5, 950, 'maintenance',
            2, ARRAY['Balcony', 'Air Conditioning'],
            'Large 2-bedroom unit currently under maintenance'
        );
    END IF;
END $$;

-- Create varied units for the Oakwood Court property
DO $$
DECLARE
    oakwood_property_id UUID;
    demo_tenant_id UUID;
BEGIN
    -- Get the property ID for Oakwood Court
    SELECT id INTO oakwood_property_id FROM public.properties 
    WHERE street_address = '456 Oakwood Court' 
    AND deleted_at IS NULL 
    LIMIT 1;
    
    -- Get a demo tenant ID
    SELECT id INTO demo_tenant_id FROM auth.users WHERE email = 'tenant@openkey.com';
    
    IF oakwood_property_id IS NOT NULL THEN
        -- Clear any existing units for this property to avoid duplicates
        DELETE FROM public.property_units WHERE property_id = oakwood_property_id;
        
        -- Unit 101 - Available
        INSERT INTO public.property_units (
            property_id, unit_number, unit_name, monthly_rent, 
            bedrooms, bathrooms, square_feet, status,
            floor_number, unit_amenities, description
        ) VALUES (
            oakwood_property_id, '101', '456 Oakwood Court - Unit 101', 1500.00,
            1, 1, 800, 'available',
            1, ARRAY['Pool Access', 'Gym Access', 'Parking'],
            'Modern 1-bedroom with pool and gym access'
        );
        
        -- Unit 102 - Occupied
        INSERT INTO public.property_units (
            property_id, unit_number, unit_name, monthly_rent, 
            bedrooms, bathrooms, square_feet, status, tenant_id,
            lease_start_date, lease_end_date, floor_number,
            unit_amenities, description
        ) VALUES (
            oakwood_property_id, '102', '456 Oakwood Court - Unit 102', 1700.00,
            2, 2, 1100, 'occupied', demo_tenant_id,
            '2024-06-01', '2025-05-31', 1,
            ARRAY['Pool Access', 'Gym Access', 'Parking', 'In-unit Washer/Dryer'],
            'Luxury 2-bedroom with premium amenities'
        );
        
        -- Unit 201 - Available
        INSERT INTO public.property_units (
            property_id, unit_number, unit_name, monthly_rent, 
            bedrooms, bathrooms, square_feet, status,
            floor_number, unit_amenities, description
        ) VALUES (
            oakwood_property_id, '201', '456 Oakwood Court - Unit 201', 1550.00,
            1, 1, 850, 'available',
            2, ARRAY['Pool Access', 'Gym Access', 'Parking', 'City View'],
            'Second floor 1-bedroom with city views'
        );
        
        -- Unit 202 - Available
        INSERT INTO public.property_units (
            property_id, unit_number, unit_name, monthly_rent, 
            bedrooms, bathrooms, square_feet, status,
            floor_number, unit_amenities, description
        ) VALUES (
            oakwood_property_id, '202', '456 Oakwood Court - Unit 202', 1750.00,
            2, 2, 1150, 'available',
            2, ARRAY['Pool Access', 'Gym Access', 'Parking', 'In-unit Washer/Dryer', 'City View'],
            'Premium 2-bedroom with city views and luxury finishes'
        );
        
        -- Unit 301 - Available
        INSERT INTO public.property_units (
            property_id, unit_number, unit_name, monthly_rent, 
            bedrooms, bathrooms, square_feet, status,
            floor_number, unit_amenities, description
        ) VALUES (
            oakwood_property_id, '301', '456 Oakwood Court - Unit 301', 1600.00,
            1, 1, 900, 'available',
            3, ARRAY['Pool Access', 'Gym Access', 'Parking', 'City View', 'Balcony'],
            'Top floor 1-bedroom with balcony and panoramic views'
        );
        
        -- Unit 302 - Unavailable (being renovated)
        INSERT INTO public.property_units (
            property_id, unit_number, unit_name, monthly_rent, 
            bedrooms, bathrooms, square_feet, status,
            floor_number, unit_amenities, description
        ) VALUES (
            oakwood_property_id, '302', '456 Oakwood Court - Unit 302', 1800.00,
            2, 2, 1200, 'unavailable',
            3, ARRAY['Pool Access', 'Gym Access', 'Parking', 'In-unit Washer/Dryer', 'City View', 'Balcony'],
            'Luxury 2-bedroom penthouse unit currently being renovated'
        );
    END IF;
END $$;