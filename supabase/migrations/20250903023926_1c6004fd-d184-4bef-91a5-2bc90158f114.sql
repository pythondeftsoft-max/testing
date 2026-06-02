-- Update the enforce_weekly_application_limit function to raise standardized error message
CREATE OR REPLACE FUNCTION public.enforce_weekly_application_limit()
RETURNS TRIGGER AS $$
DECLARE
  weekly_count INTEGER;
  has_subscription BOOLEAN;
  has_admin_push BOOLEAN;
BEGIN
  -- Skip check for admin users
  IF is_admin(NEW.tenant_id) THEN
    RETURN NEW;
  END IF;

  -- Check for admin push bypass first
  SELECT COUNT(*) > 0 INTO has_admin_push
  FROM property_pushes pp
  WHERE pp.tenant_id = NEW.tenant_id
    AND pp.property_id = NEW.property_id
    AND pp.quota_bypass = true
    AND pp.expires_at > NOW();

  IF has_admin_push THEN
    RETURN NEW;
  END IF;

  -- Check if user has active subscription
  SELECT EXISTS(
    SELECT 1 FROM subscriptions 
    WHERE user_id = NEW.tenant_id 
      AND status = 'active'
      AND role = 'tenant'
      AND (current_period_end IS NULL OR current_period_end > NOW())
  ) INTO has_subscription;

  -- Skip weekly limit for subscribers
  IF has_subscription THEN
    RETURN NEW;
  END IF;

  -- Count applications in the current week
  SELECT COUNT(*) INTO weekly_count
  FROM property_applications
  WHERE tenant_id = NEW.tenant_id
    AND created_at >= DATE_TRUNC('week', NOW())
    AND created_at < DATE_TRUNC('week', NOW()) + INTERVAL '7 days';

  -- Check if limit exceeded
  IF weekly_count >= 3 THEN
    RAISE EXCEPTION 'WEEKLY_APPLICATION_LIMIT_EXCEEDED';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the duplicate/older trigger if it exists
DROP TRIGGER IF EXISTS enforce_application_limit_trigger ON property_applications;

-- Ensure we have the correct trigger name
DROP TRIGGER IF EXISTS enforce_weekly_application_limit_trigger ON property_applications;

-- Create the trigger with the correct name
CREATE TRIGGER enforce_weekly_application_limit_trigger
  BEFORE INSERT ON property_applications
  FOR EACH ROW
  EXECUTE FUNCTION enforce_weekly_application_limit();