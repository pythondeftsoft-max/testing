-- Add sample delinquent tenant data using rent_ledger (simpler approach)

-- First, let's update any properties with NULL portfolio_id to assign them to existing portfolios
UPDATE properties 
SET portfolio_id = (
  SELECT id FROM portfolios 
  WHERE owner_id = properties.owner_id 
  LIMIT 1
)
WHERE portfolio_id IS NULL 
AND owner_id IN (SELECT owner_id FROM portfolios);

-- Get some existing properties and tenants for our test data
WITH sample_properties AS (
  SELECT p.id as property_id, p.owner_id, pr.id as tenant_id, p.monthly_rent
  FROM properties p
  JOIN profiles pr ON pr.user_type = 'tenant'
  WHERE p.monthly_rent IS NOT NULL
  LIMIT 6
),
-- Create overdue rent ledger entries
overdue_scenarios AS (
  SELECT 
    property_id,
    tenant_id,
    monthly_rent as amount,
    CASE 
      WHEN ROW_NUMBER() OVER () = 1 THEN '2025-09-01'::date -- 18 days late
      WHEN ROW_NUMBER() OVER () = 2 THEN '2025-08-15'::date -- 35 days late
      WHEN ROW_NUMBER() OVER () = 3 THEN '2025-07-15'::date -- 66 days late
      WHEN ROW_NUMBER() OVER () = 4 THEN '2025-06-15'::date -- 96 days late
      WHEN ROW_NUMBER() OVER () = 5 THEN '2025-08-05'::date -- 45 days late
      ELSE '2025-05-20'::date -- 120+ days late
    END as payment_date,
    owner_id
  FROM sample_properties
)
-- Insert into rent_ledger to create overdue scenarios
INSERT INTO rent_ledger (
  property_id,
  tenant_id,
  amount,
  payment_date,
  payment_type,
  payment_source,
  description,
  created_at,
  updated_at
)
SELECT 
  property_id,
  tenant_id,
  amount,
  payment_date,
  'rent',
  'tenant',
  'Monthly rent payment - OVERDUE',
  NOW(),
  NOW()
FROM overdue_scenarios;

-- Create property applications for these relationships
INSERT INTO property_applications (
  property_id,
  tenant_id,
  status,
  application_data,
  created_at,
  updated_at
) 
SELECT DISTINCT 
  rl.property_id,
  rl.tenant_id,
  'approved',
  jsonb_build_object(
    'application_type', 'standard',
    'monthly_rent', rl.amount,
    'move_in_date', rl.payment_date - INTERVAL '30 days'
  ),
  NOW() - INTERVAL '60 days',
  NOW()
FROM rent_ledger rl
WHERE rl.created_at >= NOW() - INTERVAL '1 hour'
AND NOT EXISTS (
  SELECT 1 FROM property_applications pa 
  WHERE pa.property_id = rl.property_id 
  AND pa.tenant_id = rl.tenant_id
);

-- Update properties to show they are occupied
UPDATE properties 
SET 
  occupancy_status = 'occupied',
  status = 'occupied',
  on_market = false
WHERE id IN (
  SELECT DISTINCT property_id 
  FROM rent_ledger 
  WHERE created_at >= NOW() - INTERVAL '1 hour'
);

-- Add contact info to tenant profiles
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
  FROM rent_ledger 
  WHERE created_at >= NOW() - INTERVAL '1 hour'
);