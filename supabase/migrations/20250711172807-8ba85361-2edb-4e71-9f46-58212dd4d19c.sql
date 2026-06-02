-- Clean up tenant@openkey.com to have only one property (with proper FK handling)
-- Step 1: Remove message limits for applications we're about to delete
DELETE FROM public.message_limits 
WHERE property_application_id IN (
  SELECT id FROM public.property_applications 
  WHERE tenant_id = '03e26106-4179-4b55-bd38-66c5414e8ba2' 
  AND property_id != '42e5d1ed-d300-4f3b-b604-11137fd2ea25'
);

-- Step 2: Remove messages for applications we're about to delete
DELETE FROM public.messages 
WHERE property_application_id IN (
  SELECT id FROM public.property_applications 
  WHERE tenant_id = '03e26106-4179-4b55-bd38-66c5414e8ba2' 
  AND property_id != '42e5d1ed-d300-4f3b-b604-11137fd2ea25'
);

-- Step 3: Remove extra property applications (keep only the Cicero property)
DELETE FROM public.property_applications 
WHERE tenant_id = '03e26106-4179-4b55-bd38-66c5414e8ba2' 
AND property_id != '42e5d1ed-d300-4f3b-b604-11137fd2ea25';

-- Step 4: Update other properties back to available status
UPDATE public.properties 
SET status = 'available', lease_start_date = NULL, lease_end_date = NULL
WHERE owner_id = '03e26106-4179-4b55-bd38-66c5414e8ba2' 
AND id != '42e5d1ed-d300-4f3b-b604-11137fd2ea25';

-- Step 5: Ensure the correct property is occupied
UPDATE public.properties 
SET status = 'occupied'
WHERE id = '42e5d1ed-d300-4f3b-b604-11137fd2ea25';

-- Step 6: Verify the cleanup - should show only one application and property
SELECT 
  'Final state - tenant applications:' as info,
  COUNT(*) as count
FROM property_applications 
WHERE tenant_id = '03e26106-4179-4b55-bd38-66c5414e8ba2'

UNION ALL

SELECT 
  'Final state - available properties:' as info,
  COUNT(*) as count
FROM properties 
WHERE owner_id = '03e26106-4179-4b55-bd38-66c5414e8ba2' 
AND status = 'available'

UNION ALL

SELECT 
  'Final state - occupied properties:' as info,
  COUNT(*) as count
FROM properties 
WHERE owner_id = '03e26106-4179-4b55-bd38-66c5414e8ba2' 
AND status = 'occupied';