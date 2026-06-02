-- Create realistic tenant profiles with complete data using generated UUIDs
-- First, let's create some tenant profile records using gen_random_uuid()
WITH new_tenants AS (
  INSERT INTO profiles (id, first_name, last_name, user_type, phone, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Sarah', 'Johnson', 'tenant', '555-0101', now(), now()),
  (gen_random_uuid(), 'Michael', 'Davis', 'tenant', '555-0102', now(), now()),
  (gen_random_uuid(), 'Jessica', 'Williams', 'tenant', '555-0103', now(), now()),
  (gen_random_uuid(), 'David', 'Brown', 'tenant', '555-0104', now(), now()),
  (gen_random_uuid(), 'Ashley', 'Wilson', 'tenant', '555-0105', now(), now())
  RETURNING id, first_name
)
INSERT INTO tenant_profiles (user_id, monthly_income, max_rent, credit_score, employment_status, voucher_holder, voucher_amount, city, zip_code, preferred_locations, message_credits, is_plus_subscriber, bedrooms_approved, has_pets, pet_type, created_at, updated_at)
SELECT 
  nt.id,
  CASE 
    WHEN nt.first_name = 'Sarah' THEN 3200
    WHEN nt.first_name = 'Michael' THEN 4500
    WHEN nt.first_name = 'Jessica' THEN 2800
    WHEN nt.first_name = 'David' THEN 5200
    WHEN nt.first_name = 'Ashley' THEN 3800
  END as monthly_income,
  CASE 
    WHEN nt.first_name = 'Sarah' THEN 1200
    WHEN nt.first_name = 'Michael' THEN 1800
    WHEN nt.first_name = 'Jessica' THEN 1000
    WHEN nt.first_name = 'David' THEN 2000
    WHEN nt.first_name = 'Ashley' THEN 1500
  END as max_rent,
  CASE 
    WHEN nt.first_name = 'Sarah' THEN 720
    WHEN nt.first_name = 'Michael' THEN 680
    WHEN nt.first_name = 'Jessica' THEN 650
    WHEN nt.first_name = 'David' THEN 750
    WHEN nt.first_name = 'Ashley' THEN 700
  END as credit_score,
  CASE 
    WHEN nt.first_name = 'Jessica' THEN 'Part-time'
    ELSE 'Full-time'
  END as employment_status,
  CASE 
    WHEN nt.first_name IN ('Sarah', 'Jessica', 'Ashley') THEN true
    ELSE false
  END as voucher_holder,
  CASE 
    WHEN nt.first_name = 'Sarah' THEN 1100
    WHEN nt.first_name = 'Jessica' THEN 950
    WHEN nt.first_name = 'Ashley' THEN 1200
    ELSE 0
  END as voucher_amount,
  'Springfield' as city,
  CASE 
    WHEN nt.first_name = 'Sarah' THEN '62701'
    WHEN nt.first_name = 'Michael' THEN '62702'
    WHEN nt.first_name = 'Jessica' THEN '62703'
    WHEN nt.first_name = 'David' THEN '62704'
    WHEN nt.first_name = 'Ashley' THEN '62705'
  END as zip_code,
  CASE 
    WHEN nt.first_name = 'Sarah' THEN ARRAY['Downtown', 'North Side']
    WHEN nt.first_name = 'Michael' THEN ARRAY['South Side', 'West End']
    WHEN nt.first_name = 'Jessica' THEN ARRAY['Downtown', 'East Side']
    WHEN nt.first_name = 'David' THEN ARRAY['North Side', 'West End']
    WHEN nt.first_name = 'Ashley' THEN ARRAY['South Side', 'Downtown']
  END as preferred_locations,
  CASE 
    WHEN nt.first_name = 'Michael' THEN 5
    WHEN nt.first_name = 'David' THEN 3
    WHEN nt.first_name = 'Jessica' THEN 1
    ELSE 2
  END as message_credits,
  CASE 
    WHEN nt.first_name IN ('Michael', 'Ashley') THEN true
    ELSE false
  END as is_plus_subscriber,
  CASE 
    WHEN nt.first_name = 'Sarah' THEN ARRAY['1', '2']
    WHEN nt.first_name = 'Michael' THEN ARRAY['2', '3']
    WHEN nt.first_name = 'Jessica' THEN ARRAY['1']
    WHEN nt.first_name = 'David' THEN ARRAY['2', '3', '4']
    WHEN nt.first_name = 'Ashley' THEN ARRAY['1', '2', '3']
  END as bedrooms_approved,
  CASE 
    WHEN nt.first_name IN ('Michael', 'David') THEN true
    ELSE false
  END as has_pets,
  CASE 
    WHEN nt.first_name = 'Michael' THEN 'Cat'
    WHEN nt.first_name = 'David' THEN 'Dog'
    ELSE null
  END as pet_type,
  now() as created_at,
  now() as updated_at
FROM new_tenants nt;