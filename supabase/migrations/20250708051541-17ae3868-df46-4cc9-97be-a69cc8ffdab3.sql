-- Update existing tenant profiles with more realistic data
UPDATE tenant_profiles SET
    monthly_income = COALESCE(monthly_income, 3500.00),
    credit_score = COALESCE(credit_score, 720),
    employment_status = COALESCE(employment_status, 'employed'),
    voucher_holder = COALESCE(voucher_holder, true),
    voucher_amount = COALESCE(voucher_amount, 1200.00),
    housing_authority = COALESCE(housing_authority, 'Metropolitan Housing Authority'),
    has_eviction = COALESCE(has_eviction, false),
    has_felonies = COALESCE(has_felonies, false),
    has_pets = COALESCE(has_pets, false),
    city = COALESCE(city, 'Saint Louis'),
    zip_code = COALESCE(zip_code, '63137'),
    rent_range_min = COALESCE(rent_range_min, 1200.00),
    rent_range_max = COALESCE(rent_range_max, 1600.00),
    bedrooms_approved = COALESCE(bedrooms_approved, ARRAY['2', '3']),
    move_in_window = COALESCE(move_in_window, '30-days'),
    phone_type = COALESCE(phone_type, 'mobile'),
    reference_contacts = COALESCE(reference_contacts, ARRAY['{"name": "Jennifer Martinez", "phone": "314-555-0111", "relationship": "Sister"}', '{"name": "Robert Johnson", "phone": "314-555-0222", "relationship": "Father"}'])
WHERE user_id IN (SELECT id FROM profiles WHERE user_type = 'tenant');

-- Update existing tenant profiles with better names
UPDATE profiles SET
    first_name = CASE 
        WHEN first_name IS NULL OR first_name = 'Unknown' THEN 'Sarah'
        ELSE first_name
    END,
    last_name = CASE 
        WHEN last_name IS NULL OR last_name = 'Applicant' THEN 'Johnson'
        ELSE last_name
    END,
    phone = COALESCE(phone, '314-555-0234')
WHERE user_type = 'tenant';

-- Add some sample interview appointments if none exist
DO $$
DECLARE
    v_landlord_id UUID;
    v_property_ids UUID[];
    v_tenant_ids UUID[];
    v_appointment_count INTEGER;
BEGIN
    -- Get landlord and property/tenant IDs
    SELECT id INTO v_landlord_id FROM profiles WHERE user_type = 'individual_owner' LIMIT 1;
    SELECT ARRAY_AGG(id) INTO v_property_ids FROM properties WHERE owner_id = v_landlord_id LIMIT 3;
    SELECT ARRAY_AGG(id) INTO v_tenant_ids FROM profiles WHERE user_type = 'tenant' LIMIT 3;
    
    -- Check if appointments already exist
    SELECT COUNT(*) INTO v_appointment_count FROM viewing_appointments WHERE viewing_appointments.landlord_id = v_landlord_id;
    
    -- Only add appointments if none exist and we have the required data
    IF v_appointment_count = 0 AND v_landlord_id IS NOT NULL AND array_length(v_property_ids, 1) > 0 AND array_length(v_tenant_ids, 1) > 0 THEN
        INSERT INTO viewing_appointments (
            landlord_id,
            tenant_id,
            property_id,
            appointment_date,
            viewing_type,
            status,
            notes
        ) VALUES
        (v_landlord_id, v_tenant_ids[1], v_property_ids[1], '2025-07-10 14:00:00', 'in_person', 'scheduled', 'Tenant interested in downtown location'),
        (v_landlord_id, v_tenant_ids[2], v_property_ids[2], '2025-07-11 10:00:00', 'video', 'scheduled', 'Initial video screening'),
        (v_landlord_id, v_tenant_ids[3], v_property_ids[3], '2025-07-12 16:00:00', 'phone', 'scheduled', 'Phone interview for studio apartment');
    END IF;
END $$;