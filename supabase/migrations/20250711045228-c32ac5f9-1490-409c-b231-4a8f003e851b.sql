-- Update the landlord@openkey.com profile to mark Stripe onboarding as complete
UPDATE public.profiles 
SET stripe_onboarding_complete = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'landlord@openkey.com'
);

-- Check current property data to understand rent discrepancy
SELECT id, address, monthly_rent, status, owner_id 
FROM public.properties 
WHERE owner_id = (
  SELECT id FROM auth.users WHERE email = 'landlord@openkey.com'
)
ORDER BY created_at;