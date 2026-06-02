-- Expand subscription_plans table with full plan management capabilities
ALTER TABLE public.subscription_plans
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS price INTEGER, -- Price in cents
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS billing_interval TEXT DEFAULT 'month' CHECK (billing_interval IN ('month', 'year')),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS limits JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_synced_at TIMESTAMPTZ;

-- Add unique constraints for Stripe IDs
ALTER TABLE public.subscription_plans
ADD CONSTRAINT unique_stripe_product_id UNIQUE (stripe_product_id),
ADD CONSTRAINT unique_stripe_price_id UNIQUE (stripe_price_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscription_plans_role ON public.subscription_plans(role);
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON public.subscription_plans(is_active);

-- Migrate existing plans with full details
UPDATE public.subscription_plans SET
  name = 'Free',
  price = 0,
  description = 'Basic features for getting started',
  features = '["1 property listing", "5 applications per month", "Basic support", "Email notifications"]'::jsonb,
  limits = '{"properties": 1, "applications": 5}'::jsonb,
  target_audience = 'Landlords & Tenants'
WHERE id = 'free';

UPDATE public.subscription_plans SET
  name = 'Tenant Pro',
  price = 999, -- $9.99
  description = 'Unlimited applications for active tenants',
  features = '["Unlimited applications", "Application tracking", "Priority support", "Document storage", "Credit monitoring"]'::jsonb,
  limits = '{"applications": "unlimited"}'::jsonb,
  target_audience = 'Tenants'
WHERE id = 'tenant_pro';

UPDATE public.subscription_plans SET
  name = 'Basic',
  price = 2900, -- $29
  description = 'Essential tools for small landlords',
  features = '["5 property listings", "25 applications per month", "Priority email support", "Basic analytics", "Document management"]'::jsonb,
  limits = '{"properties": 5, "applications": 25}'::jsonb,
  target_audience = 'Small Landlords'
WHERE id = 'basic';

UPDATE public.subscription_plans SET
  name = 'Pro',
  price = 9900, -- $99
  description = 'Advanced features for professional landlords',
  features = '["Unlimited properties", "Unlimited applications", "Priority support", "Advanced analytics", "Tenant screening", "Custom branding", "API access"]'::jsonb,
  limits = '{"properties": "unlimited", "applications": "unlimited"}'::jsonb,
  target_audience = 'Professional Landlords'
WHERE id = 'pro';

UPDATE public.subscription_plans SET
  name = 'Premium',
  price = 19900, -- $199
  description = 'Enterprise-grade property management',
  features = '["Everything in Pro", "Dedicated account manager", "Custom integrations", "Advanced reporting", "Multi-user accounts", "SLA guarantee"]'::jsonb,
  limits = '{"properties": "unlimited", "applications": "unlimited"}'::jsonb,
  target_audience = 'Property Management'
WHERE id = 'premium';

UPDATE public.subscription_plans SET
  name = 'White Label',
  price = 49900, -- $499
  description = 'Fully customizable platform for enterprise partners',
  features = '["Everything in Premium", "Full white labeling", "Custom domain", "API access", "Dedicated infrastructure", "Revenue sharing", "Custom features"]'::jsonb,
  limits = '{"properties": "unlimited", "applications": "unlimited"}'::jsonb,
  target_audience = 'Enterprise Partners'
WHERE id = 'white_label';

-- Add comments for documentation
COMMENT ON COLUMN public.subscription_plans.price IS 'Price in cents (e.g., 999 for $9.99)';
COMMENT ON COLUMN public.subscription_plans.features IS 'Array of feature strings in JSON format';
COMMENT ON COLUMN public.subscription_plans.limits IS 'Object with properties/applications limits in JSON format';
COMMENT ON COLUMN public.subscription_plans.stripe_product_id IS 'Stripe product ID after sync';
COMMENT ON COLUMN public.subscription_plans.stripe_price_id IS 'Stripe price ID after sync';
COMMENT ON COLUMN public.subscription_plans.stripe_synced_at IS 'Timestamp of last successful Stripe sync';