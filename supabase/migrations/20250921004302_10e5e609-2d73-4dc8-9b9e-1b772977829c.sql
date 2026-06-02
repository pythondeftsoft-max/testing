-- Add sample property units and ensure unit-tenant relationships
-- First, let's add some property units for properties that have approved applications

INSERT INTO property_units (id, property_id, unit_number, unit_type, bedrooms, bathrooms, square_feet, monthly_rent, is_occupied, tenant_id, lease_start_date, lease_end_date)
SELECT 
  gen_random_uuid(),
  p.id,
  '1',
  'apartment',
  p.bedrooms,
  p.bathrooms,
  p.square_feet,
  p.monthly_rent,
  true,
  pa.tenant_id,
  p.lease_start_date,
  p.lease_end_date
FROM properties p
JOIN property_applications pa ON p.id = pa.property_id
WHERE pa.status = 'approved'
AND p.lease_start_date IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM property_units pu WHERE pu.property_id = p.id
)
LIMIT 10;

-- Add some rent payments for these units
INSERT INTO rent_payments (id, property_id, tenant_id, amount, due_date, payment_date, payment_type, payment_method, status, days_late)
SELECT 
  gen_random_uuid(),
  pu.property_id,
  pu.tenant_id,
  pu.monthly_rent * 0.8, -- 80% payment
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day', -- Due on 1st of month
  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '3 days', -- Paid on 3rd
  'rent',
  'ach',
  'completed',
  2
FROM property_units pu
WHERE pu.is_occupied = true
AND pu.tenant_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM rent_payments rp 
  WHERE rp.property_id = pu.property_id 
  AND rp.tenant_id = pu.tenant_id
  AND DATE_TRUNC('month', rp.due_date) = DATE_TRUNC('month', CURRENT_DATE)
)
LIMIT 5;

-- Add some tenant balances
INSERT INTO tenant_balances (id, property_id, tenant_id, previous_balance, current_balance, as_of_date)
SELECT 
  gen_random_uuid(),
  pu.property_id,
  pu.tenant_id,
  CASE 
    WHEN random() < 0.3 THEN (pu.monthly_rent * 0.5)
    ELSE 0
  END,
  CASE 
    WHEN random() < 0.3 THEN (pu.monthly_rent * 0.3)
    ELSE 0
  END,
  CURRENT_DATE - INTERVAL '1 month'
FROM property_units pu
WHERE pu.is_occupied = true
AND pu.tenant_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM tenant_balances tb 
  WHERE tb.property_id = pu.property_id 
  AND tb.tenant_id = pu.tenant_id
)
LIMIT 5;