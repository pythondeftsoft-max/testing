UPDATE subscription_plans
SET 
  is_active = true,
  price = 9900,
  target_audience = 'Landlords who want custom branding',
  description = 'Add custom branding and white-label capabilities to any plan',
  features = '["Custom branding & logo", "Custom domain mapping", "Full theme customization", "Custom email templates", "Remove OpenKey branding", "Custom landing page"]'::jsonb,
  limits = '{}'::jsonb,
  updated_at = now()
WHERE id = 'white_label';