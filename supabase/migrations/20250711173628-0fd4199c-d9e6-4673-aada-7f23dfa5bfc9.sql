-- Clean up incorrect rent payment records for Chicago property
-- Keep only records for the Cicero property where tenant has approved application

-- Delete rent payment records for properties where tenant doesn't have approved applications
DELETE FROM public.rent_payments 
WHERE tenant_id = (
  SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'
)
AND property_id NOT IN (
  SELECT pa.property_id 
  FROM public.property_applications pa
  WHERE pa.tenant_id = (SELECT id FROM auth.users WHERE email = 'tenant@openkey.com')
  AND pa.status = 'approved'
);

-- Update property status to ensure correct state
UPDATE public.properties 
SET status = 'available'
WHERE status NOT IN ('occupied', 'deleted');

-- Ensure the Cicero property (where tenant has approved application) is marked as occupied
UPDATE public.properties 
SET status = 'occupied'
WHERE id IN (
  SELECT pa.property_id 
  FROM public.property_applications pa
  WHERE pa.tenant_id = (SELECT id FROM auth.users WHERE email = 'tenant@openkey.com')
  AND pa.status = 'approved'
);