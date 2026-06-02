-- Deactivate the old combined free plan
UPDATE subscription_plans
SET is_active = false, updated_at = now()
WHERE id = 'free';

-- Create free landlord plan
INSERT INTO subscription_plans (
  id, name, price, role, target_audience, description, features, limits, is_active, created_at, updated_at
) VALUES (
  'free_landlord',
  'Free Landlord',
  0,
  'landlord',
  'Small landlords getting started',
  'Perfect for landlords managing their first property',
  '["1 property listing", "Basic support", "Email notifications"]'::jsonb,
  '{"properties": 1}'::jsonb,
  true,
  now(),
  now()
);

-- Create free tenant plan
INSERT INTO subscription_plans (
  id, name, price, role, target_audience, description, features, limits, is_active, created_at, updated_at
) VALUES (
  'free_tenant',
  'Free Tenant',
  0,
  'tenant',
  'Tenants searching for rentals',
  'Perfect for tenants looking for their next home',
  '["5 applications per month", "Basic support", "Email notifications", "Application tracking"]'::jsonb,
  '{"applications": 5}'::jsonb,
  true,
  now(),
  now()
);