-- Clean up tenant@openkey.com to have only one property
-- Step 1: Remove extra property applications (keep only the Cicero property)
DELETE FROM public.property_applications 
WHERE tenant_id = '03e26106-4179-4b55-bd38-66c5414e8ba2' 
AND property_id != '42e5d1ed-d300-4f3b-b604-11137fd2ea25';

-- Step 2: Update other properties back to available status
UPDATE public.properties 
SET status = 'available', lease_start_date = NULL, lease_end_date = NULL
WHERE owner_id = '03e26106-4179-4b55-bd38-66c5414e8ba2' 
AND id != '42e5d1ed-d300-4f3b-b604-11137fd2ea25';

-- Step 3: Ensure the correct property is occupied
UPDATE public.properties 
SET status = 'occupied'
WHERE id = '42e5d1ed-d300-4f3b-b604-11137fd2ea25';

-- Step 4: Verify the cleanup - should show only one application and property
SELECT 
  'Applications for tenant@openkey.com:' as section,
  pa.id as application_id,
  pa.property_id,
  pa.status,
  p.address,
  p.status as property_status,
  p.monthly_rent
FROM property_applications pa
JOIN properties p ON pa.property_id = p.id
WHERE pa.tenant_id = '03e26106-4179-4b55-bd38-66c5414e8ba2'

UNION ALL

SELECT 
  'All properties by Demo Landlord:' as section,
  NULL as application_id,
  p.id as property_id,
  p.status,
  p.address,
  p.status as property_status,
  p.monthly_rent
FROM properties p
WHERE p.owner_id = '03e26106-4179-4b55-bd38-66c5414e8ba2'
ORDER BY section, application_id;