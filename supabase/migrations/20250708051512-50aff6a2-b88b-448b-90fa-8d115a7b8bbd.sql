-- Update existing tenant profiles with more realistic data
UPDATE tenant_profiles SET
    monthly_income = CASE 
        WHEN monthly_income IS NULL THEN 3500.00
        ELSE monthly_income
    END,
    credit_score = CASE 
        WHEN credit_score IS NULL THEN 720
        ELSE credit_score
    END,
    employment_status = CASE 
        WHEN employment_status IS NULL THEN 'employed'
        ELSE employment_status
    END,
    voucher_holder = CASE 
        WHEN voucher_holder IS NULL THEN true
        ELSE voucher_holder
    END,
    voucher_amount = CASE 
        WHEN voucher_amount IS NULL THEN 1200.00
        ELSE voucher_amount
    END,
    housing_authority = CASE 
        WHEN housing_authority IS NULL THEN 'Metropolitan Housing Authority'
        ELSE housing_authority
    END,
    has_eviction = CASE 
        WHEN has_eviction IS NULL THEN false
        ELSE has_eviction
    END,
    has_felonies = CASE 
        WHEN has_felonies IS NULL THEN false
        ELSE has_felonies
    END,
    has_pets = CASE 
        WHEN has_pets IS NULL THEN false
        ELSE has_pets
    END,
    city = CASE 
        WHEN city IS NULL THEN 'Saint Louis'
        ELSE city
    END,
    zip_code = CASE 
        WHEN zip_code IS NULL THEN '63137'
        ELSE zip_code
    END,
    rent_range_min = CASE 
        WHEN rent_range_min IS NULL THEN 1200.00
        ELSE rent_range_min
    END,
    rent_range_max = CASE 
        WHEN rent_range_max IS NULL THEN 1600.00
        ELSE rent_range_max
    END,
    bedrooms_approved = CASE 
        WHEN bedrooms_approved IS NULL THEN ARRAY['2', '3']
        ELSE bedrooms_approved
    END,
    move_in_window = CASE 
        WHEN move_in_window IS NULL THEN '30-days'
        ELSE move_in_window
    END,
    phone_type = CASE 
        WHEN phone_type IS NULL THEN 'mobile'
        ELSE phone_type
    END,
    reference_contacts = CASE 
        WHEN reference_contacts IS NULL THEN ARRAY['{"name": "Jennifer Martinez", "phone": "314-555-0111", "relationship": "Sister"}', '{"name": "Robert Johnson", "phone": "314-555-0222", "relationship": "Father"}']
        ELSE reference_contacts
    END
WHERE user_id IN (SELECT id FROM profiles WHERE user_type = 'tenant');

-- Update existing tenant profiles with better names if they don't have good names
UPDATE profiles SET
    first_name = CASE 
        WHEN first_name IS NULL OR first_name = 'Unknown' THEN 'Sarah'
        ELSE first_name
    END,
    last_name = CASE 
        WHEN last_name IS NULL OR last_name = 'Applicant' THEN 'Johnson'
        ELSE last_name
    END,
    phone = CASE 
        WHEN phone IS NULL THEN '314-555-0234'
        ELSE phone
    END
WHERE user_type = 'tenant';

-- Add some sample interview appointments if none exist
DO $$
DECLARE
    landlord_id UUID;
    property_ids UUID[];
    tenant_ids UUID[];
    appointment_count INTEGER;
BEGIN
    -- Get landlord and property/tenant IDs
    SELECT id INTO landlord_id FROM profiles WHERE user_type = 'individual_owner' LIMIT 1;
    SELECT ARRAY_AGG(id) INTO property_ids FROM properties WHERE owner_id = landlord_id LIMIT 3;
    SELECT ARRAY_AGG(id) INTO tenant_ids FROM profiles WHERE user_type = 'tenant' LIMIT 3;
    
    -- Check if appointments already exist
    SELECT COUNT(*) INTO appointment_count FROM viewing_appointments WHERE landlord_id = landlord_id;
    
    -- Only add appointments if none exist and we have the required data
    IF appointment_count = 0 AND landlord_id IS NOT NULL AND array_length(property_ids, 1) > 0 AND array_length(tenant_ids, 1) > 0 THEN
        INSERT INTO viewing_appointments (
            landlord_id,
            tenant_id,
            property_id,
            appointment_date,
            viewing_type,
            status,
            notes
        ) VALUES
        (landlord_id, tenant_ids[1], property_ids[1], '2025-07-10 14:00:00', 'in_person', 'scheduled', 'Tenant interested in downtown location'),
        (landlord_id, tenant_ids[2], property_ids[2], '2025-07-11 10:00:00', 'video', 'scheduled', 'Initial video screening'),
        (landlord_id, tenant_ids[3], property_ids[3], '2025-07-12 16:00:00', 'phone', 'scheduled', 'Phone interview for studio apartment');
    END IF;
END $$;

-- Add sample maintenance requests for occupied properties
DO $$
DECLARE
    tenant_id UUID;
    property_id UUID;
    request_count INTEGER;
BEGIN
    -- Get a tenant and occupied property
    SELECT p.id, pr.id INTO tenant_id, property_id 
    FROM profiles p 
    JOIN properties pr ON pr.status = 'occupied' 
    WHERE p.user_type = 'tenant' 
    LIMIT 1;
    
    -- Check if maintenance requests already exist
    SELECT COUNT(*) INTO request_count FROM maintenance_requests;
    
    -- Only add requests if none exist and we have the required data
    IF request_count = 0 AND tenant_id IS NOT NULL AND property_id IS NOT NULL THEN
        INSERT INTO maintenance_requests (
            tenant_id,
            property_id,
            title,
            description,
            priority,
            status
        ) VALUES
        (tenant_id, property_id, 'Kitchen Faucet Dripping', 'The kitchen faucet has been dripping for several days.', 'medium', 'pending'),
        (tenant_id, property_id, 'Front Door Lock Sticking', 'The front door lock is difficult to turn and sometimes gets stuck.', 'high', 'pending');
    END IF;
END $$;