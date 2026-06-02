-- Simplify: Update existing data to create delinquent scenarios

-- Update existing rent payments to be overdue with various delinquency stages
UPDATE rent_payments 
SET 
  due_date = CASE 
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1) THEN '2025-09-01'::date -- 18 days late
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 1) THEN '2025-08-15'::date -- 35 days late
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 2) THEN '2025-07-15'::date -- 66 days late
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 3) THEN '2025-06-15'::date -- 96 days late
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 4) THEN '2025-08-05'::date -- 45 days late
    ELSE '2025-05-20'::date -- 120+ days late
  END,
  status = 'pending',
  late_fee_amount = CASE 
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1) THEN 25.00
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 1) THEN 50.00
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 2) THEN 75.00
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 3) THEN 100.00
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 4) THEN 60.00
    ELSE 150.00
  END,
  days_late = CASE 
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1) THEN 18
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 1) THEN 35
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 2) THEN 66
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 3) THEN 96
    WHEN id = (SELECT id FROM rent_payments ORDER BY created_at LIMIT 1 OFFSET 4) THEN 45
    ELSE 120
  END,
  updated_at = NOW()
WHERE id IN (SELECT id FROM rent_payments ORDER BY created_at LIMIT 6);

-- Update properties to have proper portfolio assignments and occupancy
UPDATE properties 
SET 
  portfolio_id = (
    SELECT id FROM portfolios 
    WHERE owner_id = properties.owner_id 
    LIMIT 1
  ),
  occupancy_status = 'occupied',
  status = 'occupied',
  on_market = false
WHERE portfolio_id IS NULL 
AND owner_id IN (SELECT owner_id FROM portfolios)
AND id IN (SELECT DISTINCT property_id FROM rent_payments);

-- Ensure property applications exist for tenant-property relationships
INSERT INTO property_applications (
  property_id,
  tenant_id,
  status,
  created_at,
  updated_at
) 
SELECT DISTINCT 
  rp.property_id,
  rp.tenant_id,
  'approved',
  NOW() - INTERVAL '60 days',
  NOW()
FROM rent_payments rp
WHERE rp.updated_at >= NOW() - INTERVAL '1 hour'
AND NOT EXISTS (
  SELECT 1 FROM property_applications pa 
  WHERE pa.property_id = rp.property_id 
  AND pa.tenant_id = rp.tenant_id
)
LIMIT 6;

-- Update tenant profiles with contact information
UPDATE profiles 
SET 
  phone = CASE 
    WHEN phone IS NULL OR phone = '' THEN 
      CASE (random() * 3)::int
        WHEN 0 THEN '(555) 123-4567'
        WHEN 1 THEN '(555) 987-6543'  
        WHEN 2 THEN '(555) 456-7890'
        ELSE '(555) 321-9876'
      END
    ELSE phone
  END,
  first_name = COALESCE(first_name, 'John'),
  last_name = COALESCE(last_name, 'Doe')
WHERE user_type = 'tenant'
AND id IN (
  SELECT DISTINCT tenant_id 
  FROM rent_payments 
  WHERE updated_at >= NOW() - INTERVAL '1 hour'
);