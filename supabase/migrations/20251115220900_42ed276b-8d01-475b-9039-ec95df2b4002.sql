-- Create platform_configs table for storing configurable settings
CREATE TABLE IF NOT EXISTS public.platform_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_configs ENABLE ROW LEVEL SECURITY;

-- Only admins can read and modify platform configs
CREATE POLICY "Admins can view platform configs"
  ON public.platform_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can update platform configs"
  ON public.platform_configs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can insert platform configs"
  ON public.platform_configs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Insert default fee configuration
INSERT INTO public.platform_configs (config_key, config_value, description)
VALUES (
  'fee_rates',
  '{"tenant_fee_rate": 0.005, "platform_fee_rate": 0.005}'::jsonb,
  'Fee rates: tenant_fee_rate is charged to tenant, platform_fee_rate is deducted from landlord rent'
) ON CONFLICT (config_key) DO NOTHING;

-- Create or replace the calculate_platform_fees function to use dynamic rates
CREATE OR REPLACE FUNCTION public.calculate_platform_fees(rent_amount DECIMAL)
RETURNS TABLE (
  tenant_total DECIMAL,
  tenant_fee DECIMAL,
  platform_fee DECIMAL,
  net_to_pm DECIMAL
) AS $$
DECLARE
  tenant_rate DECIMAL;
  platform_rate DECIMAL;
BEGIN
  -- Fetch current fee rates from platform_configs
  SELECT 
    (config_value->>'tenant_fee_rate')::DECIMAL,
    (config_value->>'platform_fee_rate')::DECIMAL
  INTO tenant_rate, platform_rate
  FROM public.platform_configs
  WHERE config_key = 'fee_rates';
  
  -- Default to 0.5% each if config not found
  tenant_rate := COALESCE(tenant_rate, 0.005);
  platform_rate := COALESCE(platform_rate, 0.005);
  
  -- Calculate fees
  RETURN QUERY SELECT
    rent_amount * (1 + tenant_rate),  -- Total tenant pays
    rent_amount * tenant_rate,         -- Fee charged to tenant
    rent_amount * platform_rate,       -- Fee from landlord's rent
    rent_amount * (1 - platform_rate); -- Net to landlord
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_platform_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_platform_configs_updated_at
  BEFORE UPDATE ON public.platform_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_platform_configs_updated_at();