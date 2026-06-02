-- Update platform fee configuration with realistic Stripe processing fees
-- Tenant pays 100% of Stripe fees, platform revenue remains 0.5% split 50/50

UPDATE platform_configs
SET config_value = jsonb_set(
  jsonb_set(
    jsonb_set(
      config_value,
      '{card,stripe_processing_fee}',
      '0.029'
    ),
    '{ach,stripe_processing_fee}',
    '0.008'
  ),
  '{us_bank_account,stripe_processing_fee}',
  '0.008'
)
WHERE config_key = 'fee_rates';

-- Drop and recreate calculate_platform_fees with Stripe fixed fees
DROP FUNCTION IF EXISTS calculate_platform_fees(DECIMAL, TEXT);

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
  v_stripe_percentage_rate DECIMAL;
  v_stripe_fixed_fee DECIMAL;
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

  -- Extract fee components
  v_stripe_percentage_rate := COALESCE((v_method_config->>'stripe_processing_fee')::DECIMAL, 0.029);
  v_platform_revenue_rate := COALESCE((v_method_config->>'platform_revenue_fee')::DECIMAL, 0.005);
  v_tenant_pays_percent := COALESCE((v_method_config->>'tenant_pays_percent')::DECIMAL, 50);
  v_landlord_pays_percent := COALESCE((v_method_config->>'landlord_pays_percent')::DECIMAL, 50);

  -- Calculate Stripe fixed fee based on payment method
  IF p_payment_method = 'card' THEN
    v_stripe_fixed_fee := 0.30;
  ELSIF p_payment_method IN ('ach', 'us_bank_account') THEN
    -- ACH has a $5 cap, but we'll calculate percentage first then cap it
    v_stripe_fixed_fee := 0;
  ELSE
    v_stripe_fixed_fee := 0;
  END IF;

  -- Calculate Stripe processing fee (percentage + fixed)
  v_stripe_fee_amount := (p_rent_amount * v_stripe_percentage_rate) + v_stripe_fixed_fee;
  
  -- Cap ACH fees at $5
  IF p_payment_method IN ('ach', 'us_bank_account') AND v_stripe_fee_amount > 5 THEN
    v_stripe_fee_amount := 5;
  END IF;

  -- Calculate platform revenue (your profit - based on rent amount only)
  v_platform_revenue_total := p_rent_amount * v_platform_revenue_rate;

  -- Split platform revenue between tenant and landlord
  v_tenant_platform_fee := v_platform_revenue_total * (v_tenant_pays_percent / 100);
  v_landlord_platform_fee := v_platform_revenue_total * (v_landlord_pays_percent / 100);

  -- Tenant pays 100% of Stripe fees + their portion of platform fee
  -- Landlord pays their portion of platform fee from the rent
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