
-- Create a system_config table for admin-configurable settings
CREATE TABLE public.system_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  config_type TEXT NOT NULL DEFAULT 'number',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Add Row Level Security
ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage system config
CREATE POLICY "Admins can manage system config" 
  ON public.system_config 
  FOR ALL 
  USING (is_admin(auth.uid()));

-- Add trigger to auto-update the updated_at timestamp
CREATE TRIGGER update_system_config_updated_at
  BEFORE UPDATE ON public.system_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configuration values
INSERT INTO public.system_config (config_key, config_value, description, config_type, created_by) VALUES
('points_per_rent_payment', '1000', 'Points awarded for each on-time rent payment', 'number', (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1)),
('points_per_referral', '10000', 'Points awarded for each successful referral (after 60-day milestone)', 'number', (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1)),
('points_per_lease_renewal', '5000', 'Points awarded for each lease renewal', 'number', (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1)),
('points_to_dollar_ratio', '100', 'Number of points equal to $1 in rewards (100 points = $1)', 'number', (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1)),
('section_8_bonus_multiplier', '1.5', 'Multiplier for Section 8 tenants (1.5x points)', 'number', (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1)),
('referral_5x_bonus', '25000', 'Bonus points for reaching 5 successful referrals', 'number', (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1)),
('early_payment_bonus', '500', 'Bonus points for paying rent early (before due date)', 'number', (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1)),
('maintenance_cooperation_bonus', '250', 'Points for tenant cooperation during maintenance', 'number', (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1)),
('points_system_enabled', 'true', 'Global toggle for the entire points system', 'boolean', (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1)),
('max_points_per_month', '50000', 'Maximum points a user can earn per month', 'number', (SELECT id FROM profiles WHERE user_type = 'admin' LIMIT 1));

-- Create index for efficient querying by config key
CREATE INDEX idx_system_config_key ON public.system_config(config_key);

-- Create function to get config value with fallback
CREATE OR REPLACE FUNCTION public.get_config_value(key TEXT, fallback_value JSONB DEFAULT NULL)
RETURNS JSONB
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT config_value FROM public.system_config WHERE config_key = key AND config_value IS NOT NULL),
    fallback_value
  );
$$;

-- Create function to get config value as integer
CREATE OR REPLACE FUNCTION public.get_config_int(key TEXT, fallback_value INTEGER DEFAULT 0)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT (config_value #>> '{}')::INTEGER FROM public.system_config WHERE config_key = key),
    fallback_value
  );
$$;

-- Create function to get config value as boolean
CREATE OR REPLACE FUNCTION public.get_config_bool(key TEXT, fallback_value BOOLEAN DEFAULT false)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT (config_value #>> '{}')::BOOLEAN FROM public.system_config WHERE config_key = key),
    fallback_value
  );
$$;

-- Create function to get config value as numeric/decimal
CREATE OR REPLACE FUNCTION public.get_config_numeric(key TEXT, fallback_value NUMERIC DEFAULT 0)
RETURNS NUMERIC
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT (config_value #>> '{}')::NUMERIC FROM public.system_config WHERE config_key = key),
    fallback_value
  );
$$;
