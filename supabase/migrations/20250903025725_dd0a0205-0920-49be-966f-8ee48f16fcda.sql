-- Fix application quota to 3 per week and cleanup duplicates
-- 1. Update the weekly limit to 3 applications per week consistently
CREATE OR REPLACE FUNCTION public.check_application_quota(p_tenant_id UUID)
RETURNS TABLE(
  can_apply BOOLEAN,
  remaining_applications INTEGER,
  is_subscriber BOOLEAN
) LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_last_reset TIMESTAMP WITH TIME ZONE;
  v_applications_count INTEGER;
  v_is_subscriber BOOLEAN;
  v_weekly_limit INTEGER := 3; -- Updated to 3 per week
BEGIN
  -- Check if user has active subscription
  SELECT has_active_subscription(p_tenant_id, 'tenant') INTO v_is_subscriber;
  
  -- If subscriber, return unlimited
  IF v_is_subscriber THEN
    RETURN QUERY SELECT true, 999, true;
    RETURN;
  END IF;
  
  -- Get the most recent reset date for this tenant
  SELECT reset_at INTO v_last_reset
  FROM public.application_quota_resets
  WHERE tenant_id = p_tenant_id
  ORDER BY reset_at DESC
  LIMIT 1;
  
  -- Calculate window start (7 days ago or last reset, whichever is more recent)
  v_window_start := GREATEST(
    now() - INTERVAL '7 days',
    COALESCE(v_last_reset, '1970-01-01'::TIMESTAMP WITH TIME ZONE)
  );
  
  -- Count applications in the current window
  SELECT COUNT(*) INTO v_applications_count
  FROM public.property_applications
  WHERE tenant_id = p_tenant_id
    AND created_at >= v_window_start;
  
  -- Return quota status
  RETURN QUERY SELECT 
    (v_applications_count < v_weekly_limit),
    GREATEST(0, v_weekly_limit - v_applications_count),
    v_is_subscriber;
END;
$$;

-- 2. Update enforce_weekly_application_limit trigger function to use 3 per week
CREATE OR REPLACE FUNCTION public.enforce_weekly_application_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_last_reset TIMESTAMP WITH TIME ZONE;
  v_applications_count INTEGER;
  v_is_subscriber BOOLEAN;
  v_has_admin_push BOOLEAN;
  v_weekly_limit INTEGER := 3; -- Updated to 3 per week
BEGIN
  -- Skip enforcement for priority payment applications
  IF NEW.priority_payment_made = true THEN
    RETURN NEW;
  END IF;
  
  -- Check if user has active subscription (subscribers get unlimited)
  SELECT has_active_subscription(NEW.tenant_id, 'tenant') INTO v_is_subscriber;
  
  IF v_is_subscriber THEN
    RETURN NEW;
  END IF;
  
  -- Check for admin push bypass (allows application even over limit)
  SELECT EXISTS(
    SELECT 1 FROM public.property_tenant_requests ptr
    WHERE ptr.property_id = NEW.property_id
      AND ptr.requested_by = NEW.tenant_id
      AND ptr.status = 'active'
  ) INTO v_has_admin_push;
  
  IF v_has_admin_push THEN
    RETURN NEW;
  END IF;
  
  -- Get the most recent reset date for this tenant
  SELECT reset_at INTO v_last_reset
  FROM public.application_quota_resets
  WHERE tenant_id = NEW.tenant_id
  ORDER BY reset_at DESC
  LIMIT 1;
  
  -- Calculate window start (7 days ago or last reset, whichever is more recent)
  v_window_start := GREATEST(
    now() - INTERVAL '7 days',
    COALESCE(v_last_reset, '1970-01-01'::TIMESTAMP WITH TIME ZONE)
  );
  
  -- Count existing applications in the current window
  SELECT COUNT(*) INTO v_applications_count
  FROM public.property_applications
  WHERE tenant_id = NEW.tenant_id
    AND created_at >= v_window_start;
  
  -- Check if limit would be exceeded
  IF v_applications_count >= v_weekly_limit THEN
    RAISE EXCEPTION 'WEEKLY_APPLICATION_LIMIT_EXCEEDED: You have reached your weekly application limit of % applications. Limit resets in 7 days from your first application this week.', v_weekly_limit;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Schedule the process-subscription-cancellations function to run every hour
SELECT cron.schedule(
  'process-tenant-subscription-cancellations',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/process-subscription-cancellations',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTAzNDY0OCwiZXhwIjoyMDY2NjEwNjQ4fQ.0kCYEe4QVYzgcfJQdnwwXH-xz9zKGa1pKgOwg9cO3hM"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- 4. Ensure triggers are properly set up and not duplicated
-- Drop and recreate to ensure clean state
DROP TRIGGER IF EXISTS check_application_quota_trigger ON public.property_applications;
CREATE TRIGGER check_application_quota_trigger
  BEFORE INSERT ON public.property_applications
  FOR EACH ROW EXECUTE FUNCTION public.enforce_weekly_application_limit();