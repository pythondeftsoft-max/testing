-- Create more property applications for existing tenants
-- Get the newly created property IDs and create applications

INSERT INTO property_applications (tenant_id, property_id, status, priority_payment_made, priority_payment_amount, tenant_score, created_at)
SELECT 
  'eb292509-b618-43b3-869c-0abedd81a26b', -- Nick Tahal
  p.id,
  CASE 
    WHEN p.monthly_rent <= 1500 THEN 'approved'
    WHEN p.monthly_rent <= 2500 THEN 'pending'
    ELSE 'rejected'
  END,
  CASE 
    WHEN p.monthly_rent <= 2000 THEN true
    ELSE false
  END,
  15.00,
  CASE 
    WHEN p.monthly_rent <= 1500 THEN 9
    WHEN p.monthly_rent <= 2500 THEN 8
    ELSE 6
  END,
  now() - interval '3 days' + (random() * interval '2 days')
FROM properties p
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
  AND p.address LIKE '%Urban Loft%' -- Modern Downtown Loft
ON CONFLICT (tenant_id, property_id) DO NOTHING;

INSERT INTO property_applications (tenant_id, property_id, status, priority_payment_made, priority_payment_amount, tenant_score, created_at)
SELECT 
  '9cf6bcaf-9f49-4bcf-90ad-beee8b631de6', -- Logan Test
  p.id,
  'pending',
  true,
  15.00,
  8,
  now() - interval '2 days'
FROM properties p
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
  AND p.address LIKE '%Maple Grove%' -- Luxury Family Home
ON CONFLICT (tenant_id, property_id) DO NOTHING;

INSERT INTO property_applications (tenant_id, property_id, status, priority_payment_made, priority_payment_amount, tenant_score, created_at)
SELECT 
  'd2b76a2b-9804-430d-976f-eb38cdf8e917', -- Logan Testo
  p.id,
  'approved',
  true,
  15.00,
  9,
  now() - interval '1 day'
FROM properties p
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
  AND p.address LIKE '%Victorian%' -- Charming Victorian
ON CONFLICT (tenant_id, property_id) DO NOTHING;

-- Add more applications for different properties
INSERT INTO property_applications (tenant_id, property_id, status, priority_payment_made, priority_payment_amount, tenant_score, created_at)
SELECT 
  'eb292509-b618-43b3-869c-0abedd81a26b', -- Nick Tahal
  p.id,
  'pending',
  false,
  15.00,
  7,
  now() - interval '4 hours'
FROM properties p
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
  AND p.address LIKE '%Community Way%' -- Section 8 Duplex
ON CONFLICT (tenant_id, property_id) DO NOTHING;

INSERT INTO property_applications (tenant_id, property_id, status, priority_payment_made, priority_payment_amount, tenant_score, created_at)
SELECT 
  '9cf6bcaf-9f49-4bcf-90ad-beee8b631de6', -- Logan Test
  p.id,
  'pending',
  true,
  15.00,
  8,
  now() - interval '6 hours'
FROM properties p
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
  AND p.address LIKE '%Studio Plaza%' -- Modern Studio
ON CONFLICT (tenant_id, property_id) DO NOTHING;