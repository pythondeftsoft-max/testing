-- Update NULL subscription_tier values to 'free'
UPDATE profiles 
SET subscription_tier = 'free' 
WHERE subscription_tier IS NULL;

-- Drop and recreate the check_application_quota function with NULL handling
DROP FUNCTION IF EXISTS check_application_quota(uuid);

CREATE OR REPLACE FUNCTION check_application_quota(p_tenant_id uuid)
RETURNS TABLE (
  can_apply boolean,
  remaining_applications integer,
  is_subscriber boolean,
  subscription_tier text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_applications_this_week integer;
  v_weekly_limit integer;
  v_is_subscriber boolean;
  v_subscription_tier text;
BEGIN
  -- Get subscription info with NULL handling
  SELECT 
    COALESCE(p.subscription_tier, 'free'),
    (p.subscription_tier = 'plus' OR p.subscription_tier = 'tenant_pro')
  INTO v_subscription_tier, v_is_subscriber
  FROM profiles p
  WHERE p.id = p_tenant_id;

  -- If profile not found, use defaults
  IF v_subscription_tier IS NULL THEN
    v_subscription_tier := 'free';
    v_is_subscriber := false;
  END IF;

  -- Set weekly limit based on subscription tier
  v_weekly_limit := CASE 
    WHEN v_subscription_tier = 'plus' THEN 999999
    WHEN v_subscription_tier = 'tenant_pro' THEN 20
    ELSE 5
  END;

  -- Count applications in the last 7 days
  SELECT COUNT(*)
  INTO v_applications_this_week
  FROM rental_applications
  WHERE tenant_id = p_tenant_id
    AND created_at >= NOW() - INTERVAL '7 days';

  -- Return the results
  RETURN QUERY SELECT
    (v_applications_this_week < v_weekly_limit) AS can_apply,
    GREATEST(0, v_weekly_limit - v_applications_this_week) AS remaining_applications,
    v_is_subscriber AS is_subscriber,
    v_subscription_tier AS subscription_tier;
END;
$$;