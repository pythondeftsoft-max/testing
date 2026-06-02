-- Add separate redemption rate configurations for landlords and tenants
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
('redemption_rate_landlord', '100', 'number', 'Points needed per $1 in rewards for landlords/PMs (100 = 100 points per dollar)'),
('redemption_rate_tenant', '200', 'number', 'Points needed per $1 in rewards for tenants (200 = 200 points per dollar)'),
('redemption_min_points_landlord', '500', 'number', 'Minimum points landlords must convert at once'),
('redemption_min_points_tenant', '1000', 'number', 'Minimum points tenants must convert at once')
ON CONFLICT (config_key) DO NOTHING;

-- Update convert_points function to use user-type-based redemption rates
CREATE OR REPLACE FUNCTION public.convert_points(
  p_user_id uuid,
  p_points integer,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_points integer;
  v_rate numeric := 100;
  v_min_points integer := 500;
  v_fee_percent numeric := 0;
  v_dollar_value numeric;
  v_fee_amount numeric;
  v_final_value numeric;
  v_user_type text;
  v_conversion_id uuid;
BEGIN
  -- Get user type
  SELECT user_type INTO v_user_type
  FROM public.profiles
  WHERE id = p_user_id
  LIMIT 1;

  -- Load redemption rate based on user type
  IF v_user_type = 'tenant' THEN
    SELECT config_value::numeric INTO v_rate
    FROM public.system_config
    WHERE config_key = 'redemption_rate_tenant'
    LIMIT 1;
    
    SELECT config_value::integer INTO v_min_points
    FROM public.system_config
    WHERE config_key = 'redemption_min_points_tenant'
    LIMIT 1;
  ELSE
    -- landlord, individual_owner, property_manager, or any other type
    SELECT config_value::numeric INTO v_rate
    FROM public.system_config
    WHERE config_key = 'redemption_rate_landlord'
    LIMIT 1;
    
    SELECT config_value::integer INTO v_min_points
    FROM public.system_config
    WHERE config_key = 'redemption_min_points_landlord'
    LIMIT 1;
  END IF;

  -- Fallback to defaults if config not found
  v_rate := COALESCE(v_rate, 100);
  v_min_points := COALESCE(v_min_points, 500);

  -- Get current points
  SELECT total_points INTO v_current_points
  FROM public.user_points_summary
  WHERE user_id = p_user_id;

  -- Validate conversion
  IF v_current_points IS NULL OR v_current_points < p_points THEN
    RAISE EXCEPTION 'Insufficient points. Available: %, Requested: %', COALESCE(v_current_points, 0), p_points;
  END IF;

  IF p_points < v_min_points THEN
    RAISE EXCEPTION 'Minimum conversion amount is % points', v_min_points;
  END IF;

  -- Calculate dollar value
  v_dollar_value := p_points / v_rate;
  v_fee_amount := v_dollar_value * (v_fee_percent / 100);
  v_final_value := v_dollar_value - v_fee_amount;

  -- Create conversion record
  INSERT INTO public.points_conversions (
    user_id,
    points_converted,
    dollar_value,
    conversion_rate,
    fee_amount,
    final_value,
    status,
    notes
  ) VALUES (
    p_user_id,
    p_points,
    v_dollar_value,
    v_rate,
    v_fee_amount,
    v_final_value,
    'completed',
    COALESCE(p_notes, 'Points converted to gift card value')
  ) RETURNING id INTO v_conversion_id;

  -- Deduct points
  INSERT INTO public.user_points (
    user_id,
    source_type,
    source_event_type,
    points_change,
    notes,
    metadata
  ) VALUES (
    p_user_id,
    'conversion',
    'points_redeemed',
    -p_points,
    'Points converted to gift card value',
    jsonb_build_object(
      'conversion_id', v_conversion_id,
      'dollar_value', v_final_value,
      'conversion_rate', v_rate
    )
  );

  -- Add gift card value
  INSERT INTO public.user_gift_cards (
    user_id,
    amount,
    source_type,
    source_id,
    notes
  ) VALUES (
    p_user_id,
    v_final_value,
    'points_conversion',
    v_conversion_id,
    COALESCE(p_notes, 'Converted from ' || p_points || ' points')
  );

  RETURN jsonb_build_object(
    'success', true,
    'conversion_id', v_conversion_id,
    'points_converted', p_points,
    'dollar_value', v_final_value,
    'conversion_rate', v_rate,
    'user_type', v_user_type
  );
END;
$$;