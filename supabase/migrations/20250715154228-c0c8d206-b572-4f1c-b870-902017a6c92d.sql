-- Create test portfolios
INSERT INTO public.portfolios (id, manager_id, client_name, client_email, client_phone, created_at, updated_at)
VALUES 
  (gen_random_uuid(), '450bde79-9106-4f10-8eac-98df09ad5539', 'Everything', 'everything@example.com', '555-0001', now(), now()),
  (gen_random_uuid(), '450bde79-9106-4f10-8eac-98df09ad5539', 'Test 1', 'test1@example.com', '555-0002', now(), now());

-- Create new multi-unit property "1234 Riverside Apartments"
INSERT INTO public.properties (
  id, owner_id, portfolio_id, address, street_address, city, state, zipcode, 
  monthly_rent, status, unit_count, bedrooms, bathrooms, square_feet,
  property_type, created_at, updated_at
)
VALUES (
  gen_random_uuid(),
  '450bde79-9106-4f10-8eac-98df09ad5539',
  (SELECT id FROM public.portfolios WHERE client_name = 'Everything' AND manager_id = '450bde79-9106-4f10-8eac-98df09ad5539'),
  '1234 Riverside Apartments, Chicago, IL 60601',
  '1234 Riverside Drive',
  'Chicago',
  'IL',
  '60601',
  5000,
  'occupied',
  4,
  2,
  1.5,
  2400,
  'apartment',
  now(),
  now()
);

-- Get the property ID for creating units
WITH new_property AS (
  SELECT id as property_id FROM public.properties 
  WHERE street_address = '1234 Riverside Drive' AND city = 'Chicago'
)
-- Create 4 units with different configurations
INSERT INTO public.property_units (
  id, property_id, unit_number, unit_name, monthly_rent, bedrooms, bathrooms, 
  square_feet, status, has_voucher, voucher_type, voucher_amount, 
  pha_portion, tenant_portion, pha_payment_day, tenant_payment_day,
  pha_contact_name, pha_contact_email, pha_contact_phone,
  created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  np.property_id,
  unit_data.unit_number,
  unit_data.unit_name,
  unit_data.monthly_rent,
  unit_data.bedrooms,
  unit_data.bathrooms,
  unit_data.square_feet,
  unit_data.status,
  unit_data.has_voucher,
  unit_data.voucher_type,
  unit_data.voucher_amount,
  unit_data.pha_portion,
  unit_data.tenant_portion,
  unit_data.pha_payment_day,
  unit_data.tenant_payment_day,
  unit_data.pha_contact_name,
  unit_data.pha_contact_email,
  unit_data.pha_contact_phone,
  now(),
  now()
FROM new_property np
CROSS JOIN (
  VALUES 
    ('101', 'Unit 101', 1200, 1, 1, 600, 'occupied', false, null, 0, 0, 0, 1, 1, null, null, null),
    ('102', 'Unit 102', 1400, 2, 1, 800, 'occupied', true, 'section8', 1400, 900, 500, 15, 1, 'John Smith', 'john.smith@pha.gov', '555-PHA-1'),
    ('201', 'Unit 201', 1300, 1, 1, 650, 'available', true, 'housing_choice_voucher', 1300, 1000, 300, 15, 1, 'Jane Doe', 'jane.doe@pha.gov', '555-PHA-2'),
    ('202', 'Unit 202', 1600, 2, 2, 900, 'occupied', true, 'vash', 1600, 1200, 400, 15, 1, 'Mike Johnson', 'mike.johnson@va.gov', '555-VA-1')
) AS unit_data(unit_number, unit_name, monthly_rent, bedrooms, bathrooms, square_feet, status, has_voucher, voucher_type, voucher_amount, pha_portion, tenant_portion, pha_payment_day, tenant_payment_day, pha_contact_name, pha_contact_email, pha_contact_phone);

-- Create HAP payee configurations for HAP-enabled units
WITH new_property AS (
  SELECT id as property_id FROM public.properties 
  WHERE street_address = '1234 Riverside Drive' AND city = 'Chicago'
),
hap_units AS (
  SELECT pu.id as unit_id, pu.unit_number, pu.voucher_type, pu.pha_portion, pu.tenant_portion
  FROM public.property_units pu
  JOIN new_property np ON pu.property_id = np.property_id
  WHERE pu.has_voucher = true
)
INSERT INTO public.hap_payee_configs (
  id, unit_id, tenant_id, payee_type, payee_name, is_active, 
  forms_submitted_to_pha, pha_approval_status, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  hu.unit_id,
  '450bde79-9106-4f10-8eac-98df09ad5539', -- Demo landlord as tenant for testing
  'landlord',
  'Demo Landlord',
  true,
  true,
  'approved',
  now(),
  now()
FROM hap_units hu;

-- Create sample HAP payments for the HAP-enabled units
WITH new_property AS (
  SELECT id as property_id FROM public.properties 
  WHERE street_address = '1234 Riverside Drive' AND city = 'Chicago'
),
hap_units AS (
  SELECT pu.id as unit_id, pu.unit_number, pu.pha_portion, hpc.id as payee_config_id
  FROM public.property_units pu
  JOIN new_property np ON pu.property_id = np.property_id
  JOIN public.hap_payee_configs hpc ON pu.id = hpc.unit_id
  WHERE pu.has_voucher = true
)
INSERT INTO public.hap_payments (
  id, unit_id, tenant_id, hap_payee_config_id, payment_period_start, 
  payment_period_end, expected_amount, actual_amount, payment_date, 
  payment_status, is_verified, created_at, updated_at
)
SELECT 
  gen_random_uuid(),
  hu.unit_id,
  '450bde79-9106-4f10-8eac-98df09ad5539',
  hu.payee_config_id,
  payment_data.period_start,
  payment_data.period_end,
  hu.pha_portion,
  payment_data.actual_amount,
  payment_data.payment_date,
  payment_data.status,
  payment_data.is_verified,
  now(),
  now()
FROM hap_units hu
CROSS JOIN (
  VALUES 
    ('2024-12-01'::date, '2024-12-31'::date, 'received', hu.pha_portion, '2024-12-15'::date, true),
    ('2025-01-01'::date, '2025-01-31'::date, 'received', hu.pha_portion, '2025-01-12'::date, true),
    ('2025-02-01'::date, '2025-02-28'::date, 'expected', null, null, false)
) AS payment_data(period_start, period_end, status, actual_amount, payment_date, is_verified);

-- Update existing property "789 Maple Heights" to be assigned to "Test 1" portfolio
UPDATE public.properties 
SET portfolio_id = (
  SELECT id FROM public.portfolios 
  WHERE client_name = 'Test 1' AND manager_id = '450bde79-9106-4f10-8eac-98df09ad5539'
)
WHERE address LIKE '%789 Maple Heights%';

-- Add HAP configuration to some units in the existing property
WITH existing_property AS (
  SELECT id as property_id FROM public.properties 
  WHERE address LIKE '%789 Maple Heights%'
),
existing_units AS (
  SELECT pu.id as unit_id, pu.unit_number
  FROM public.property_units pu
  JOIN existing_property ep ON pu.property_id = ep.property_id
  LIMIT 2
)
UPDATE public.property_units 
SET 
  has_voucher = true,
  voucher_type = 'section8',
  voucher_amount = 1100,
  pha_portion = 800,
  tenant_portion = 300,
  pha_payment_day = 15,
  tenant_payment_day = 1,
  pha_contact_name = 'Sarah Wilson',
  pha_contact_email = 'sarah.wilson@pha.gov',
  pha_contact_phone = '555-PHA-3',
  updated_at = now()
WHERE id IN (SELECT unit_id FROM existing_units);