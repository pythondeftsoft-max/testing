-- Add sample tenant balances for testing (retry with proper charge types)
INSERT INTO tenant_balances (property_id, tenant_id, previous_balance, as_of_date) 
SELECT 
  p.id,
  pa.tenant_id,
  CASE 
    WHEN random() > 0.7 THEN (random() * 500 + 100)::numeric(10,2)
    ELSE 0
  END as previous_balance,
  CURRENT_DATE - INTERVAL '1 month' as as_of_date
FROM properties p
JOIN property_applications pa ON p.id = pa.property_id
WHERE pa.status = 'approved'
AND NOT EXISTS (
  SELECT 1 FROM tenant_balances tb 
  WHERE tb.property_id = p.id AND tb.tenant_id = pa.tenant_id
);

-- Add sample recurring charges for testing with valid charge types
INSERT INTO recurring_charges (property_id, tenant_id, charge_name, charge_type, amount, frequency, start_date, next_due_date, is_active, applies_to)
SELECT 
  p.id,
  pa.tenant_id,
  'Pet Fee',
  'other',
  50.00,
  'monthly',
  CURRENT_DATE - INTERVAL '3 months',
  CURRENT_DATE + INTERVAL '1 month',
  true,
  'tenant'
FROM properties p
JOIN property_applications pa ON p.id = pa.property_id
WHERE pa.status = 'approved'
AND random() > 0.6
AND NOT EXISTS (
  SELECT 1 FROM recurring_charges rc 
  WHERE rc.property_id = p.id AND rc.charge_name = 'Pet Fee'
);

INSERT INTO recurring_charges (property_id, tenant_id, charge_name, charge_type, amount, frequency, start_date, next_due_date, is_active, applies_to)
SELECT 
  p.id,
  pa.tenant_id,
  'Utility Fee',
  'utilities',
  75.00,
  'monthly',
  CURRENT_DATE - INTERVAL '2 months',
  CURRENT_DATE + INTERVAL '1 month',
  true,
  'tenant'
FROM properties p
JOIN property_applications pa ON p.id = pa.property_id
WHERE pa.status = 'approved'
AND random() > 0.5
AND NOT EXISTS (
  SELECT 1 FROM recurring_charges rc 
  WHERE rc.property_id = p.id AND rc.charge_name = 'Utility Fee'
);

-- Update some properties with sample lease dates
UPDATE properties 
SET 
  lease_start_date = CURRENT_DATE - INTERVAL '6 months',
  lease_end_date = CURRENT_DATE + INTERVAL '6 months'
WHERE id IN (
  SELECT p.id 
  FROM properties p
  JOIN property_applications pa ON p.id = pa.property_id
  WHERE pa.status = 'approved'
  LIMIT 5
);