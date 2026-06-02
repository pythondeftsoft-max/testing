-- Update the landlord@openkey.com profile to mark Stripe onboarding as complete
UPDATE public.profiles 
SET stripe_onboarding_complete = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'landlord@openkey.com'
);