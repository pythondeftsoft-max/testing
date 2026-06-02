-- Add background check as a manageable product
INSERT INTO subscription_plans (
  id,
  name,
  description,
  price,
  currency,
  billing_interval,
  role,
  features,
  is_active,
  display_order,
  target_audience
) 
SELECT
  gen_random_uuid(),
  'Background Check',
  'Comprehensive background check for tenant screening (one-time purchase)',
  2500,
  'usd',
  'month',
  'landlord',
  '["Criminal history check", "Credit report", "Eviction history", "Employment verification", "Previous landlord references"]'::jsonb,
  true,
  100,
  'landlord'
WHERE NOT EXISTS (
  SELECT 1 FROM subscription_plans WHERE name = 'Background Check'
);