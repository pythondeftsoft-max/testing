-- Add pricing columns to white_label_configs table
ALTER TABLE white_label_configs
ADD COLUMN IF NOT EXISTS monthly_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS annual_cost NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual', 'free'));

-- Create white_label_pricing_tiers table for managing pricing tiers
CREATE TABLE IF NOT EXISTS white_label_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL UNIQUE CHECK (tier_name IN ('free', 'basic', 'premium', 'enterprise')),
  monthly_cost NUMERIC NOT NULL DEFAULT 0,
  annual_cost NUMERIC NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  max_domains INTEGER NOT NULL DEFAULT 1,
  max_page_views INTEGER,
  stripe_monthly_price_id TEXT,
  stripe_annual_price_id TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on white_label_pricing_tiers
ALTER TABLE white_label_pricing_tiers ENABLE ROW LEVEL SECURITY;

-- Allow public read access to pricing tiers
CREATE POLICY "Pricing tiers are viewable by everyone"
ON white_label_pricing_tiers
FOR SELECT
USING (is_active = true);

-- Insert default pricing tiers
INSERT INTO white_label_pricing_tiers (tier_name, monthly_cost, annual_cost, features, max_domains, max_page_views, display_order)
VALUES 
  ('free', 0, 0, '["1 Custom Subdomain", "Basic Branding", "Community Support"]'::jsonb, 1, 10000, 1),
  ('basic', 49, 490, '["1 Custom Domain", "Full Branding", "10K Page Views/mo", "Email Support"]'::jsonb, 1, 10000, 2),
  ('premium', 149, 1490, '["5 Custom Domains", "Advanced Features", "100K Page Views/mo", "Priority Support", "Custom Analytics"]'::jsonb, 5, 100000, 3),
  ('enterprise', 499, 4990, '["Unlimited Domains", "White Glove Support", "Unlimited Page Views", "Custom Features", "Dedicated Account Manager"]'::jsonb, 999, NULL, 4)
ON CONFLICT (tier_name) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_white_label_pricing_tiers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_white_label_pricing_tiers_timestamp
BEFORE UPDATE ON white_label_pricing_tiers
FOR EACH ROW
EXECUTE FUNCTION update_white_label_pricing_tiers_updated_at();

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_white_label_configs_subscription_tier ON white_label_configs(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_white_label_pricing_tiers_tier_name ON white_label_pricing_tiers(tier_name);