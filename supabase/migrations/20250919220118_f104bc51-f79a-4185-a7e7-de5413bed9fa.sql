-- Add sample delinquent tenant data for comprehensive testing (final)

-- First, let's update any properties with NULL portfolio_id to assign them to existing portfolios
UPDATE properties 
SET portfolio_id = (
  SELECT id FROM portfolios 
  WHERE owner_id = properties.owner_id 
  LIMIT 1
)
WHERE portfolio_id IS NULL 
AND owner_id IN (SELECT owner_id FROM portfolios);

-- Add recent overdue rent payments with various delinquency stages
INSERT INTO rent_payments (
  property_id, 
  tenant_id, 
  amount, 
  due_date, 
  status, 
  late_fee_amount, 
  days_late,
  payment_date,
  payment_source,
  payment_method,
  payment_type,
  created_at,
  updated_at
) VALUES 
-- 18 days late (Sept 1st due date)
(
  (SELECT id FROM properties WHERE monthly_rent IS NOT NULL LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
  1500.00,
  '2025-09-01',
  'pending',
  25.00,
  18,
  '2025-10-01', -- Expected payment date
  'tenant',
  'online',
  'rent',
  NOW(),
  NOW()
),
-- 35 days late (Aug 15th due date)
(
  (SELECT id FROM properties WHERE monthly_rent IS NOT NULL OFFSET 1 LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' OFFSET 1 LIMIT 1),
  1200.00,
  '2025-08-15',
  'pending',
  50.00,
  35,
  '2025-09-29', 
  'tenant',
  'online',
  'rent',
  NOW(),
  NOW()
),
-- 66 days late (July 15th due date)
(
  (SELECT id FROM properties WHERE monthly_rent IS NOT NULL OFFSET 2 LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' OFFSET 2 LIMIT 1),
  1800.00,
  '2025-07-15',
  'pending',
  75.00,
  66,
  '2025-09-29',
  'tenant',
  'online',
  'rent',
  NOW(),
  NOW()
),
-- 96 days late (June 15th due date)
(
  (SELECT id FROM properties WHERE monthly_rent IS NOT NULL OFFSET 3 LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' OFFSET 3 LIMIT 1),
  1300.00,
  '2025-06-15',
  'pending',
  100.00,
  96,
  '2025-09-23',
  'tenant',
  'online',
  'rent',
  NOW(),
  NOW()
),
-- 45 days late (Aug 5th due date)
(
  (SELECT id FROM properties WHERE monthly_rent IS NOT NULL OFFSET 4 LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' OFFSET 4 LIMIT 1),
  1600.00,
  '2025-08-05',
  'pending',
  60.00,
  45,
  '2025-10-04',
  'tenant',
  'online',
  'rent',
  NOW(),
  NOW()
),
-- 120 days late (May 20th due date) - severe delinquency
(
  (SELECT id FROM properties WHERE monthly_rent IS NOT NULL OFFSET 5 LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' OFFSET 5 LIMIT 1),
  1400.00,
  '2025-05-20',
  'pending',
  150.00,
  120,
  '2025-09-17',
  'tenant',
  'online',
  'rent',
  NOW(),
  NOW()
);

-- Ensure property applications exist for these tenant-property relationships
INSERT INTO property_applications (
  property_id,
  tenant_id,
  status,
  application_data,
  created_at,
  updated_at
) 
SELECT DISTINCT 
  rp.property_id,
  rp.tenant_id,
  'approved',
  jsonb_build_object(
    'application_type', 'standard',
    'monthly_rent', rp.amount,
    'move_in_date', rp.due_date - INTERVAL '30 days'
  ),
  NOW() - INTERVAL '60 days',
  NOW()
FROM rent_payments rp
WHERE rp.created_at >= NOW() - INTERVAL '1 hour'
AND NOT EXISTS (
  SELECT 1 FROM property_applications pa 
  WHERE pa.property_id = rp.property_id 
  AND pa.tenant_id = rp.tenant_id
);

-- Update properties to show they are occupied by these tenants
UPDATE properties 
SET 
  occupancy_status = 'occupied',
  status = 'occupied',
  on_market = false
WHERE id IN (
  SELECT DISTINCT property_id 
  FROM rent_payments 
  WHERE created_at >= NOW() - INTERVAL '1 hour'
);

-- Add some contact information to tenant profiles for better report display
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
  END
WHERE user_type = 'tenant'
AND id IN (
  SELECT DISTINCT tenant_id 
  FROM rent_payments 
  WHERE created_at >= NOW() - INTERVAL '1 hour'
);