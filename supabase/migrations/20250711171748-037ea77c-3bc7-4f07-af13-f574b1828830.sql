-- Fix tenant@openkey.com account and create proper application for testing
-- Step 1: Update tenant@openkey.com to be a tenant type
UPDATE public.profiles 
SET user_type = 'tenant'
WHERE id = '03e26106-4179-4b55-bd38-66c5414e8ba2' 
AND user_type = 'individual_owner';

-- Step 2: Create a tenant profile if it doesn't exist
INSERT INTO public.tenant_profiles (user_id, applications_this_month, message_credits)
VALUES ('03e26106-4179-4b55-bd38-66c5414e8ba2', 0, 3)
ON CONFLICT (user_id) DO NOTHING;

-- Step 3: Create an approved application for tenant@openkey.com for a property with real Stripe Connect
INSERT INTO public.property_applications (
  tenant_id, 
  property_id, 
  status, 
  priority_payment_made,
  priority_payment_amount,
  tenant_score
) VALUES (
  '03e26106-4179-4b55-bd38-66c5414e8ba2', -- tenant@openkey.com user ID
  '42e5d1ed-d300-4f3b-b604-11137fd2ea25', -- Property: "567 Community Way, Cicero, IL 60804" owned by Demo Landlord with real Stripe Connect
  'approved',
  true,
  15.00,
  8
) ON CONFLICT (tenant_id, property_id) DO NOTHING;

-- Step 4: Verify the setup - this should show the approved application with real Stripe Connect account
SELECT 
  pa.id as application_id,
  pa.tenant_id,
  pa.property_id,
  pa.status,
  p.address,
  p.monthly_rent,
  p.owner_id,
  pr.first_name,
  pr.last_name,
  pr.stripe_account_id,
  pr.stripe_onboarding_complete
FROM property_applications pa
JOIN properties p ON pa.property_id = p.id
JOIN profiles pr ON p.owner_id = pr.id
WHERE pa.tenant_id = '03e26106-4179-4b55-bd38-66c5414e8ba2'
AND pa.status = 'approved';