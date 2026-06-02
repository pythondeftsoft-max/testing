-- Add realistic test data for Accounts Receivable report

-- First, let's update the property to have realistic monthly rent
UPDATE properties 
SET monthly_rent = 1500.00,
    outstanding_balance = 2850.00,
    last_payment_date = '2024-08-15'::date,
    mtd_charges = 1500.00,
    mtd_payments = 1200.00
WHERE id = '969ceaab-8dc5-4ee5-b8e2-03dcbf845f27';

-- Update property units to have monthly rent and some outstanding balances
UPDATE property_units 
SET monthly_rent = CASE 
    WHEN unit_number = '101' THEN 1500.00
    WHEN unit_number = '102' THEN 1600.00
    WHEN unit_number = '103' THEN 1450.00
    WHEN unit_number = '104' THEN 1550.00
END,
outstanding_balance = CASE 
    WHEN unit_number = '101' THEN 1500.00  -- One month behind
    WHEN unit_number = '102' THEN 0.00     -- Current
    WHEN unit_number = '103' THEN 3100.00  -- Two months + late fees
    WHEN unit_number = '104' THEN 775.00   -- Partial payment
END,
last_payment_date = CASE 
    WHEN unit_number = '101' THEN '2024-07-15'::date
    WHEN unit_number = '102' THEN '2024-09-01'::date
    WHEN unit_number = '103' THEN '2024-06-20'::date
    WHEN unit_number = '104' THEN '2024-08-25'::date
END
WHERE property_id = '969ceaab-8dc5-4ee5-b8e2-03dcbf845f27';

-- Create realistic tenant profiles for testing
INSERT INTO profiles (id, first_name, last_name, user_type, phone, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'Sarah', 'Johnson', 'tenant', '+1-555-0101', now()),
('22222222-2222-2222-2222-222222222222', 'Michael', 'Chen', 'tenant', '+1-555-0102', now()),
('33333333-3333-3333-3333-333333333333', 'Emily', 'Rodriguez', 'tenant', '+1-555-0103', now()),
('44444444-4444-4444-4444-444444444444', 'David', 'Thompson', 'tenant', '+1-555-0104', now())
ON CONFLICT (id) DO UPDATE SET
first_name = EXCLUDED.first_name,
last_name = EXCLUDED.last_name;

-- Create property applications for the units
INSERT INTO property_applications (
    property_id, 
    tenant_id, 
    status, 
    unit_id,
    application_data,
    created_at,
    updated_at
) VALUES
-- Unit 101 - Sarah Johnson (Behind on rent)
('969ceaab-8dc5-4ee5-b8e2-03dcbf845f27', '11111111-1111-1111-1111-111111111111', 'approved', 
 (SELECT id FROM property_units WHERE property_id = '969ceaab-8dc5-4ee5-b8e2-03dcbf845f27' AND unit_number = '101'),
 '{"monthly_rent": 1500, "lease_start": "2023-08-01", "lease_end": "2024-07-31"}', now(), now()),

-- Unit 102 - Michael Chen (Current)
('969ceaab-8dc5-4ee5-b8e2-03dcbf845f27', '22222222-2222-2222-2222-222222222222', 'approved',
 (SELECT id FROM property_units WHERE property_id = '969ceaab-8dc5-4ee5-b8e2-03dcbf845f27' AND unit_number = '102'),
 '{"monthly_rent": 1600, "lease_start": "2024-01-01", "lease_end": "2024-12-31"}', now(), now()),

-- Unit 103 - Emily Rodriguez (Seriously behind)
('969ceaab-8dc5-4ee5-b8e2-03dcbf845f27', '33333333-3333-3333-3333-333333333333', 'approved',
 (SELECT id FROM property_units WHERE property_id = '969ceaab-8dc5-4ee5-b8e2-03dcbf845f27' AND unit_number = '103'),
 '{"monthly_rent": 1450, "lease_start": "2024-03-01", "lease_end": "2025-02-28"}', now(), now()),

-- Unit 104 - David Thompson (Partial payment)
('969ceaab-8dc5-4ee5-b8e2-03dcbf845f27', '44444444-4444-4444-4444-444444444444', 'approved',
 (SELECT id FROM property_units WHERE property_id = '969ceaab-8dc5-4ee5-b8e2-03dcbf845f27' AND unit_number = '104'),
 '{"monthly_rent": 1550, "lease_start": "2024-06-01", "lease_end": "2025-05-31"}', now(), now())

ON CONFLICT (property_id, tenant_id) DO UPDATE SET
status = EXCLUDED.status,
unit_id = EXCLUDED.unit_id,
application_data = EXCLUDED.application_data;

-- Create some rent payment history
INSERT INTO rent_payments (
    property_id,
    tenant_id,
    unit_id,
    amount,
    due_date,
    payment_date,
    status,
    days_late,
    late_fee_amount,
    payment_method,
    created_at
) VALUES
-- Sarah Johnson payments (Unit 101) - Behind
('969ceaab-8dc5-4ee5-b8e2-03dcbf845f27', '11111111-1111-1111-1111-111111111111',
 (SELECT id FROM property_units WHERE property_id = '969ceaab-8dc5-4ee5-b8e2-03dcbf845f27' AND unit_number = '101'),
 1500.00, '2024-07-01', '2024-07-15', 'completed', 14, 75.00, 'credit_card', '2024-07-15'::timestamp),

-- Michael Chen payments (Unit 102) - Current
('969ceaab-8dc5-4ee5-b8e2-03dcbf845f27', '22222222-2222-2222-2222-222222222222',
 (SELECT id FROM property_units WHERE property_id = '969ceaab-8dc5-4ee5-b8e2-03dcbf845f27' AND unit_number = '102'),
 1600.00, '2024-09-01', '2024-09-01', 'completed', 0, 0.00, 'bank_transfer', '2024-09-01'::timestamp),

('969ceaab-8dc5-4ee5-b8e2-03dcbf845f27', '22222222-2222-2222-2222-222222222222',
 (SELECT id FROM property_units WHERE property_id = '969ceaab-8dc5-4ee5-b8e2-03dcbf845f27' AND unit_number = '102'),
 1600.00, '2024-08-01', '2024-08-01', 'completed', 0, 0.00, 'bank_transfer', '2024-08-01'::timestamp),

-- Emily Rodriguez payments (Unit 103) - Seriously behind
('969ceaab-8dc5-4ee5-b8e2-03dcbf845f27', '33333333-3333-3333-3333-333333333333',
 (SELECT id FROM property_units WHERE property_id = '969ceaab-8dc5-4ee5-b8e2-03dcbf845f27' AND unit_number = '103'),
 1450.00, '2024-06-01', '2024-06-20', 'completed', 19, 100.00, 'check', '2024-06-20'::timestamp),

-- David Thompson payments (Unit 104) - Partial payment
('969ceaab-8dc5-4ee5-b8e2-03dcbf845f27', '44444444-4444-4444-4444-444444444444',
 (SELECT id FROM property_units WHERE property_id = '969ceaab-8dc5-4ee5-b8e2-03dcbf845f27' AND unit_number = '104'),
 775.00, '2024-08-01', '2024-08-25', 'completed', 24, 120.00, 'cash', '2024-08-25'::timestamp)

ON CONFLICT DO NOTHING;