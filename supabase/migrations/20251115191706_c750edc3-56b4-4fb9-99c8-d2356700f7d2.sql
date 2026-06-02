-- Update Basic plan to per-unit pricing ($1.16/unit)
UPDATE subscription_plans 
SET 
  price = 116,
  features = '["Property management tools", "Rent payment processing", "Maintenance request tracking", "$1.16 per unit/month", "Basic support"]'::jsonb,
  limits = '{"properties": "unlimited", "applications": "unlimited", "is_per_unit": true}'::jsonb
WHERE id = 'basic';

-- Update Pro plan to per-unit pricing ($2.00/unit)
UPDATE subscription_plans 
SET 
  price = 200,
  features = '["Everything in Basic", "Advanced analytics & reporting", "Tenant screening", "Custom branding", "API access", "$2.00 per unit/month"]'::jsonb,
  limits = '{"properties": "unlimited", "applications": "unlimited", "is_per_unit": true}'::jsonb
WHERE id = 'pro';

-- Rename Premium plan to Analytics & Tracking with flat rate ($9.99/month)
-- First, update any existing subscriptions that use 'premium' to 'analytics_tracking'
UPDATE subscriptions 
SET plan_type = 'analytics_tracking' 
WHERE plan_type = 'premium';

-- Then update the plan itself
UPDATE subscription_plans 
SET 
  id = 'analytics_tracking',
  name = 'Analytics & Tracking',
  price = 999,
  target_audience = 'Investors and portfolio viewers',
  features = '["Property analytics & insights", "Financial tracking", "Occupancy monitoring", "Investment portfolio tracking", "View-only access for invited users", "No management features", "$9.99/month flat rate"]'::jsonb,
  limits = '{"properties": "unlimited", "applications": 0, "is_per_unit": false, "management_features": false}'::jsonb
WHERE id = 'premium';