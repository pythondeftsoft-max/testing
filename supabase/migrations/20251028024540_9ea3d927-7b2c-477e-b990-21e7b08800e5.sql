-- Step 1: Create missing property application for tenant maintenance requests
-- This establishes the link between tenant 03e26106-4179-4b55-bd38-66c5414e8ba2 
-- and property 1abdf610-aa92-4789-9872-99d684b9053a

INSERT INTO property_applications (
  property_id,
  tenant_id,
  status,
  priority_payment_made
)
VALUES (
  '1abdf610-aa92-4789-9872-99d684b9053a',
  '03e26106-4179-4b55-bd38-66c5414e8ba2',
  'pending',
  false
)
ON CONFLICT (property_id, tenant_id) 
DO UPDATE SET status = property_applications.status
RETURNING id;

-- Verify the record was created
SELECT id, property_id, tenant_id, status, priority_payment_made 
FROM property_applications 
WHERE property_id = '1abdf610-aa92-4789-9872-99d684b9053a' 
  AND tenant_id = '03e26106-4179-4b55-bd38-66c5414e8ba2';