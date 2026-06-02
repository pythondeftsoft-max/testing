-- Update the demo landlord profile to have proper Stripe settings
UPDATE public.profiles 
SET 
  stripe_account_id = 'acct_demo_landlord',
  stripe_onboarding_complete = true,
  updated_at = now()
WHERE id = 'b7843bb0-64bd-4ff3-9392-b73c111832ce';