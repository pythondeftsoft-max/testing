-- Update Free Tenant plan with accurate features
UPDATE subscription_plans 
SET 
  description = 'Essential features for apartment hunting',
  features = '["5 applications per week", "Document storage", "Application tracking", "Email notifications", "Basic support"]'::jsonb,
  limits = '{"applications": 5}'::jsonb
WHERE id = 'free_tenant';

-- Update Tenant Pro plan with accurate features + fast filing marketing
UPDATE subscription_plans 
SET 
  description = '⚡ Fast filing with 20 applications per week',
  features = '["20 applications per week", "⚡ Fast filing speed", "Document storage", "Application tracking", "Email notifications", "Basic support"]'::jsonb,
  limits = '{"applications": 20}'::jsonb
WHERE id = 'tenant_pro';