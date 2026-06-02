-- Update free_landlord plan to allow unlimited property listings
UPDATE subscription_plans 
SET 
  limits = '{"properties": "unlimited"}'::jsonb,
  features = '["Unlimited property listings", "Basic support", "Email notifications"]'::jsonb
WHERE id = 'free_landlord';