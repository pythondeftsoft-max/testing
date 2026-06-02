-- Create realistic tenant profiles with complete data using proper UUIDs
-- Create tenant users in profiles table
INSERT INTO profiles (id, first_name, last_name, user_type, phone, created_at, updated_at) VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 'Sarah', 'Johnson', 'tenant', '555-0101', now(), now()),
('b2c3d4e5-f6g7-8901-2345-678901bcdefg', 'Michael', 'Davis', 'tenant', '555-0102', now(), now()),
('c3d4e5f6-g7h8-9012-3456-789012cdefgh', 'Jessica', 'Williams', 'tenant', '555-0103', now(), now()),
('d4e5f6g7-h8i9-0123-4567-890123defghi', 'David', 'Brown', 'tenant', '555-0104', now(), now()),
('e5f6g7h8-i9j0-1234-5678-901234efghij', 'Ashley', 'Wilson', 'tenant', '555-0105', now(), now())
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  user_type = EXCLUDED.user_type,
  phone = EXCLUDED.phone,
  updated_at = now();

-- Create detailed tenant profiles for each tenant
INSERT INTO tenant_profiles (user_id, monthly_income, max_rent, credit_score, employment_status, voucher_holder, voucher_amount, city, zip_code, preferred_locations, message_credits, is_plus_subscriber, bedrooms_approved, has_pets, pet_type, created_at, updated_at) VALUES
('a1b2c3d4-e5f6-7890-1234-567890abcdef', 3200, 1200, 720, 'Full-time', true, 1100, 'Springfield', '62701', ARRAY['Downtown', 'North Side'], 2, false, ARRAY['1', '2'], false, null, now(), now()),
('b2c3d4e5-f6g7-8901-2345-678901bcdefg', 4500, 1800, 680, 'Full-time', false, 0, 'Springfield', '62702', ARRAY['South Side', 'West End'], 5, true, ARRAY['2', '3'], true, 'Cat', now(), now()),
('c3d4e5f6-g7h8-9012-3456-789012cdefgh', 2800, 1000, 650, 'Part-time', true, 950, 'Springfield', '62703', ARRAY['Downtown', 'East Side'], 1, false, ARRAY['1'], false, null, now(), now()),
('d4e5f6g7-h8i9-0123-4567-890123defghi', 5200, 2000, 750, 'Full-time', false, 0, 'Springfield', '62704', ARRAY['North Side', 'West End'], 3, false, ARRAY['2', '3', '4'], true, 'Dog', now(), now()),
('e5f6g7h8-i9j0-1234-5678-901234efghij', 3800, 1500, 700, 'Full-time', true, 1200, 'Springfield', '62705', ARRAY['South Side', 'Downtown'], 2, true, ARRAY['1', '2', '3'], false, null, now(), now())
ON CONFLICT (user_id) DO UPDATE SET
  monthly_income = EXCLUDED.monthly_income,
  max_rent = EXCLUDED.max_rent,
  credit_score = EXCLUDED.credit_score,
  employment_status = EXCLUDED.employment_status,
  voucher_holder = EXCLUDED.voucher_holder,
  voucher_amount = EXCLUDED.voucher_amount,
  city = EXCLUDED.city,
  zip_code = EXCLUDED.zip_code,
  preferred_locations = EXCLUDED.preferred_locations,
  message_credits = EXCLUDED.message_credits,
  is_plus_subscriber = EXCLUDED.is_plus_subscriber,
  bedrooms_approved = EXCLUDED.bedrooms_approved,
  has_pets = EXCLUDED.has_pets,
  pet_type = EXCLUDED.pet_type,
  updated_at = now();