
-- 1. Drop the property limit trigger (already done by previous partial migration, but safe to repeat)
DROP TRIGGER IF EXISTS trigger_check_property_limits ON properties;

-- 2. Drop and recreate check_property_limit_with_notifications as read-only
DROP FUNCTION IF EXISTS public.check_property_limit_with_notifications(uuid);

CREATE FUNCTION public.check_property_limit_with_notifications(landlord_id uuid)
RETURNS TABLE (
  current_count bigint,
  free_limit integer,
  billable_units_count bigint,
  has_subscription boolean,
  needs_sub boolean,
  notification_sent_result boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count bigint;
  v_free_limit integer := 10;
  v_has_subscription boolean := false;
  v_billable bigint := 0;
  v_needs_sub boolean := false;
BEGIN
  SELECT count(*) INTO v_current_count
  FROM properties p
  WHERE p.owner_id = landlord_id
    AND p.deleted_at IS NULL
    AND (p.acquisition_source IS NULL OR p.acquisition_source != 'scout_agent');

  SELECT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = landlord_id AND s.status = 'active'
  ) INTO v_has_subscription;

  IF v_current_count > v_free_limit THEN
    v_billable := v_current_count - v_free_limit;
  END IF;

  IF v_current_count >= v_free_limit AND NOT v_has_subscription THEN
    v_needs_sub := true;
  END IF;

  RETURN QUERY SELECT
    v_current_count,
    v_free_limit,
    v_billable,
    v_has_subscription,
    v_needs_sub,
    false::boolean AS notification_sent_result;
END;
$$;

-- 3. Drop and recreate portfolio version as read-only
DROP FUNCTION IF EXISTS public.check_portfolio_property_limit_with_notifications(uuid, uuid);

CREATE FUNCTION public.check_portfolio_property_limit_with_notifications(landlord_id uuid, portfolio_id_param uuid)
RETURNS TABLE (
  current_count bigint,
  free_limit integer,
  billable_units_count bigint,
  has_subscription boolean,
  needs_sub boolean,
  notification_sent_result boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count bigint;
  v_free_limit integer := 10;
  v_has_subscription boolean := false;
  v_billable bigint := 0;
  v_needs_sub boolean := false;
BEGIN
  SELECT count(*) INTO v_current_count
  FROM properties p
  WHERE p.owner_id = landlord_id
    AND p.portfolio_id = portfolio_id_param
    AND p.deleted_at IS NULL
    AND (p.acquisition_source IS NULL OR p.acquisition_source != 'scout_agent');

  SELECT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = landlord_id AND s.status = 'active'
  ) INTO v_has_subscription;

  IF v_current_count > v_free_limit THEN
    v_billable := v_current_count - v_free_limit;
  END IF;

  IF v_current_count >= v_free_limit AND NOT v_has_subscription THEN
    v_needs_sub := true;
  END IF;

  RETURN QUERY SELECT
    v_current_count,
    v_free_limit,
    v_billable,
    v_has_subscription,
    v_needs_sub,
    false::boolean AS notification_sent_result;
END;
$$;

-- 4. Clean up spam notifications and queued emails
DELETE FROM notifications WHERE title ILIKE '%Subscription Required%' OR title ILIKE '%property limit%';
DELETE FROM email_queue WHERE subject ILIKE '%Subscription Required%' AND status = 'pending';
DELETE FROM property_limit_notifications WHERE true;
