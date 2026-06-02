-- Update Free Landlord plan to include management units limit
UPDATE subscription_plans 
SET limits = jsonb_set(
  COALESCE(limits, '{}'::jsonb), 
  '{managementUnits}', 
  '10'::jsonb
)
WHERE id = 'free_landlord';