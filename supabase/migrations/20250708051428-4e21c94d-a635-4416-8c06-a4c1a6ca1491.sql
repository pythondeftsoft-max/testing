-- Update existing landlord profile if it exists
UPDATE profiles 
SET first_name = 'Michael', 
    last_name = 'Rodriguez', 
    phone = '314-555-0123',
    company_name = 'Rodriguez Property Management'
WHERE user_type = 'individual_owner';

-- Get landlord ID and create realistic properties
DO $$
DECLARE
    landlord_id UUID;
    property_count INTEGER;
BEGIN
    -- Try to get existing landlord
    SELECT id INTO landlord_id FROM profiles WHERE user_type = 'individual_owner' LIMIT 1;
    
    -- If no landlord exists, create a placeholder
    IF landlord_id IS NULL THEN
        INSERT INTO profiles (id, first_name, last_name, phone, user_type, company_name)
        VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Michael', 'Rodriguez', '314-555-0123', 'individual_owner', 'Rodriguez Property Management');
        landlord_id := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    END IF;

    -- Check if properties already exist
    SELECT COUNT(*) INTO property_count FROM properties WHERE owner_id = landlord_id;
    
    -- Only add properties if none exist yet
    IF property_count < 6 THEN
        -- Delete existing minimal properties
        DELETE FROM properties WHERE owner_id = landlord_id AND (description IS NULL OR description = '');
        
        -- Create realistic properties with detailed information and high-quality images
        INSERT INTO properties (
          owner_id, 
          address, 
          street_address,
          city,
          state,
          zipcode,
          unit_count, 
          monthly_rent, 
          bedrooms, 
          bathrooms, 
          status,
          description,
          amenities,
          photos,
          has_voucher,
          voucher_type,
          insurance_cost,
          mortgage_cost,
          management_fee,
          repair_costs,
          late_fee_amount,
          late_fee_grace_days,
          rent_due_day
        ) VALUES 
        -- Property 1: Downtown Loft
        (landlord_id,
        '115 Monteith Cir, Saint Louis, MO 63137',
        '115 Monteith Circle',
        'Saint Louis',
        'Missouri',
        '63137',
        1,
        1450.00,
        2,
        1.5,
        'available',
        'Beautiful 2-bedroom loft in downtown Saint Louis with modern amenities, updated kitchen with granite countertops, hardwood floors throughout, and stunning city views. Perfect for professionals or small families.',
        ARRAY['Hardwood Floors', 'Granite Countertops', 'City Views', 'Modern Kitchen', 'In-Unit Laundry', 'Central Air', 'Dishwasher', 'Walk-in Closets'],
        ARRAY['https://images.unsplash.com/photo-1721322800607-8c38375eef04?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80'],
        true,
        'Section 8',
        185.00,
        950.00,
        145.00,
        75.00,
        50.00,
        5,
        1),

        -- Property 2: Family Home
        (landlord_id,
        '9701 Diamond Dr, Saint Louis, Missouri 63137',
        '9701 Diamond Drive',
        'Saint Louis',
        'Missouri',
        '63137',
        1,
        1650.00,
        3,
        2.0,
        'available',
        'Spacious 3-bedroom, 2-bathroom family home in quiet suburban neighborhood. Features large backyard, updated appliances, and excellent school district. Pet-friendly with fenced yard.',
        ARRAY['Fenced Yard', 'Updated Appliances', 'Great School District', 'Pet Friendly', 'Garage', 'Central Air', 'Fireplace', 'Large Kitchen'],
        ARRAY['https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80'],
        true,
        'Section 8',
        210.00,
        1200.00,
        165.00,
        100.00,
        50.00,
        5,
        1),

        -- Property 3: Studio Apartment
        (landlord_id,
        '456 Elm Street, Springfield, IL 62704',
        '456 Elm Street',
        'Springfield',
        'Illinois',
        '62704',
        1,
        850.00,
        1,
        1.0,
        'available',
        'Cozy studio apartment perfect for young professionals or students. Recently renovated with modern fixtures, efficient layout, and close to public transportation.',
        ARRAY['Recently Renovated', 'Modern Fixtures', 'Near Public Transit', 'Efficient Layout', 'New Appliances', 'High-Speed Internet Ready'],
        ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1631679706909-1844bbd07221?auto=format&fit=crop&w=1200&q=80'],
        true,
        'Section 8',
        125.00,
        550.00,
        85.00,
        50.00,
        35.00,
        5,
        1),

        -- Property 4: Townhouse
        (landlord_id,
        '567 Community Way, Cicero, IL 60804',
        '567 Community Way',
        'Cicero',
        'Illinois',
        '60804',
        1,
        1350.00,
        2,
        1.5,
        'available',
        'Modern townhouse in well-maintained complex. Features private entrance, small patio, updated kitchen and bathroom, and access to community amenities.',
        ARRAY['Private Entrance', 'Small Patio', 'Community Pool', 'Playground', 'On-site Laundry', 'Parking Space', 'Storage'],
        ARRAY['https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?auto=format&fit=crop&w=1200&q=80', 'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1200&q=80'],
        true,
        'Housing Choice Voucher',
        165.00,
        850.00,
        135.00,
        75.00,
        45.00,
        5,
        1);
    END IF;
END $$;