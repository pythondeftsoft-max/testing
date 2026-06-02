-- Update platform_configs to use payment-method-specific fee structure
UPDATE platform_configs
SET config_value = jsonb_build_object(
  'card', jsonb_build_object(
    'tenant_fee_rate', 0.029,
    'platform_fee_rate', 0.005
  ),
  'ach', jsonb_build_object(
    'tenant_fee_rate', 0.008,
    'platform_fee_rate', 0.005
  ),
  'us_bank_account', jsonb_build_object(
    'tenant_fee_rate', 0.008,
    'platform_fee_rate', 0.005
  ),
  'checkbook', jsonb_build_object(
    'tenant_fee_rate', 0.00,
    'platform_fee_rate', 0.00
  )
),
description = 'Payment method specific fee rates: tenant_fee_rate (charged to tenant) + platform_fee_rate (platform revenue)'
WHERE config_key = 'fee_rates';

-- Drop the old function
DROP FUNCTION IF EXISTS calculate_platform_fees(numeric);

-- Create updated function with payment_method parameter
CREATE OR REPLACE FUNCTION calculate_platform_fees(
  rent_amount numeric,
  payment_method text DEFAULT 'card'
)
RETURNS TABLE (
  tenant_total numeric,
  tenant_fee numeric,
  platform_fee numeric,
  net_to_pm numeric
) AS $$
DECLARE
  fee_config jsonb;
  tenant_rate numeric;
  platform_rate numeric;
BEGIN
  -- Get fee configuration for the specific payment method
  SELECT config_value->payment_method INTO fee_config
  FROM platform_configs
  WHERE config_key = 'fee_rates';
  
  -- Extract rates, fallback to card rates if method not found
  IF fee_config IS NULL THEN
    SELECT config_value->'card' INTO fee_config
    FROM platform_configs
    WHERE config_key = 'fee_rates';
  END IF;
  
  -- Get the rates from config, default to 0.5% if still not found
  tenant_rate := COALESCE((fee_config->>'tenant_fee_rate')::numeric, 0.005);
  platform_rate := COALESCE((fee_config->>'platform_fee_rate')::numeric, 0.005);
  
  -- Calculate fees
  RETURN QUERY
  SELECT
    ROUND(rent_amount * (1 + tenant_rate), 2) as tenant_total,
    ROUND(rent_amount * tenant_rate, 2) as tenant_fee,
    ROUND(rent_amount * platform_rate, 2) as platform_fee,
    ROUND(rent_amount * (1 - platform_rate), 2) as net_to_pm;
END;
$$ LANGUAGE plpgsql STABLE;