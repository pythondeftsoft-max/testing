-- Update check_application_quota function to set Tenant Pro weekly limit to 20
CREATE OR REPLACE FUNCTION check_application_quota(p_tenant_id UUID)
RETURNS TABLE (
  can_apply BOOLEAN,
  remaining_applications INTEGER,
  is_subscriber BOOLEAN
) AS $$
DECLARE
  v_weekly_limit INTEGER;
  v_applications_this_week INTEGER;
  v_is_subscriber BOOLEAN;
  v_plan_type TEXT;
BEGIN
  -- Check if tenant has active subscription
  SELECT 
    CASE WHEN s.id IS NOT NULL THEN TRUE ELSE FALSE END,
    s.plan_type
  INTO v_is_subscriber, v_plan_type
  FROM profiles p
  LEFT JOIN subscriptions s ON p.id = s.user_id 
    AND s.role = 'tenant' 
    AND s.status = 'active'
  WHERE p.id = p_tenant_id;

  -- Set weekly limit based on subscription status
  -- Free tenant: 5 applications per week
  -- Tenant Pro: 20 applications per week
  IF v_is_subscriber AND v_plan_type = 'tenant_pro' THEN
    v_weekly_limit := 20;
  ELSE
    v_weekly_limit := 5;
  END IF;

  -- Count applications in the current week (Monday to Sunday)
  SELECT COUNT(*)
  INTO v_applications_this_week
  FROM rental_applications
  WHERE tenant_id = p_tenant_id
    AND created_at >= date_trunc('week', CURRENT_TIMESTAMP);

  -- Add any quota adjustments that haven't expired
  SELECT COALESCE(SUM(delta), 0) + v_weekly_limit
  INTO v_weekly_limit
  FROM application_quota_adjustments
  WHERE tenant_id = p_tenant_id
    AND expires_at > NOW();

  RETURN QUERY SELECT 
    v_applications_this_week < v_weekly_limit AS can_apply,
    GREATEST(0, v_weekly_limit - v_applications_this_week) AS remaining_applications,
    v_is_subscriber AS is_subscriber;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;