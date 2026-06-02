-- Drop existing function and recreate with subscription_tier
DROP FUNCTION IF EXISTS check_application_quota(UUID);

CREATE OR REPLACE FUNCTION check_application_quota(p_tenant_id UUID)
RETURNS TABLE (
  can_apply BOOLEAN,
  remaining_applications INTEGER,
  is_subscriber BOOLEAN,
  subscription_tier TEXT
) AS $$
DECLARE
  v_subscription_tier TEXT;
  v_weekly_limit INTEGER;
  v_applications_this_week INTEGER;
  v_adjustments INTEGER;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_subscription_tier
  FROM profiles
  WHERE id = p_tenant_id;

  -- Set weekly limit based on subscription tier
  CASE v_subscription_tier
    WHEN 'plus' THEN
      v_weekly_limit := 999999; -- Unlimited
    WHEN 'tenant_pro' THEN
      v_weekly_limit := 20;
    ELSE
      v_weekly_limit := 5; -- Free tier
  END CASE;

  -- Count applications this week
  SELECT COUNT(*)::INTEGER INTO v_applications_this_week
  FROM property_applications
  WHERE tenant_id = p_tenant_id
    AND created_at >= date_trunc('week', CURRENT_TIMESTAMP);

  -- Get any quota adjustments that haven't expired
  SELECT COALESCE(SUM(delta), 0)::INTEGER INTO v_adjustments
  FROM application_quota_adjustments
  WHERE tenant_id = p_tenant_id
    AND expires_at > CURRENT_TIMESTAMP;

  -- Calculate remaining applications
  RETURN QUERY SELECT
    (v_applications_this_week < v_weekly_limit + v_adjustments) AS can_apply,
    GREATEST(0, v_weekly_limit + v_adjustments - v_applications_this_week) AS remaining_applications,
    (v_subscription_tier IN ('tenant_pro', 'plus')) AS is_subscriber,
    v_subscription_tier AS subscription_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;