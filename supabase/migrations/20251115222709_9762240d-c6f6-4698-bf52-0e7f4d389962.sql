-- Drop and recreate the calculate_platform_fees function with the new fee structure

-- Drop the existing function first
DROP FUNCTION IF EXISTS calculate_platform_fees(DECIMAL, TEXT);

-- Create the new function with split configuration support
CREATE OR REPLACE FUNCTION calculate_platform_fees(
  p_rent_amount DECIMAL,
  p_payment_method TEXT DEFAULT 'card'
)
RETURNS TABLE (
  tenant_total DECIMAL,
  tenant_fee DECIMAL,
  platform_fee DECIMAL,
  net_to_pm DECIMAL,
  stripe_fee DECIMAL,
  tenant_platform_portion DECIMAL,
  landlord_platform_portion DECIMAL
) AS $$
DECLARE
  v_config JSONB;
  v_method_config JSONB;
  v_stripe_fee_rate DECIMAL;
  v_platform_revenue_rate DECIMAL;
  v_tenant_pays_percent DECIMAL;
  v_landlord_pays_percent DECIMAL;
  v_stripe_fee_amount DECIMAL;
  v_platform_revenue_total DECIMAL;
  v_tenant_platform_fee DECIMAL;
  v_landlord_platform_fee DECIMAL;
BEGIN
  -- Get the config
  SELECT config_value INTO v_config
  FROM platform_configs
  WHERE config_key = 'fee_rates'
  LIMIT 1;

  -- Get method-specific config, default to card if not found
  v_method_config := COALESCE(v_config->p_payment_method, v_config->'card');

  -- Extract fee components with fallback values
  v_stripe_fee_rate := COALESCE((v_method_config->>'stripe_processing_fee')::DECIMAL, 0.029);
  v_platform_revenue_rate := COALESCE((v_method_config->>'platform_revenue_fee')::DECIMAL, 0.005);
  v_tenant_pays_percent := COALESCE((v_method_config->>'tenant_pays_percent')::DECIMAL, 0);
  v_landlord_pays_percent := COALESCE((v_method_config->>'landlord_pays_percent')::DECIMAL, 100);

  -- Calculate Stripe processing fee (goes to Stripe)
  v_stripe_fee_amount := p_rent_amount * v_stripe_fee_rate;

  -- Calculate platform revenue (your profit)
  v_platform_revenue_total := p_rent_amount * v_platform_revenue_rate;

  -- Split platform revenue between tenant and landlord
  v_tenant_platform_fee := v_platform_revenue_total * (v_tenant_pays_percent / 100);
  v_landlord_platform_fee := v_platform_revenue_total * (v_landlord_pays_percent / 100);

  -- Return calculated values
  RETURN QUERY SELECT
    p_rent_amount + v_stripe_fee_amount + v_tenant_platform_fee AS tenant_total,
    v_stripe_fee_amount + v_tenant_platform_fee AS tenant_fee,
    v_platform_revenue_total AS platform_fee,
    p_rent_amount - v_landlord_platform_fee AS net_to_pm,
    v_stripe_fee_amount AS stripe_fee,
    v_tenant_platform_fee AS tenant_platform_portion,
    v_landlord_platform_fee AS landlord_platform_portion;
END;
$$ LANGUAGE plpgsql STABLE;