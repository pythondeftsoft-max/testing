-- 1) Fast path for lookups
CREATE INDEX IF NOT EXISTS idx_property_applications_tenant_created
  ON public.property_applications (tenant_id, created_at);

-- 2) Function to check the weekly application quota (rolling 7 days)
CREATE OR REPLACE FUNCTION public.check_application_quota(p_tenant_id uuid)
RETURNS TABLE (
  can_apply boolean,
  remaining_applications integer,
  is_subscriber boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_subscriber boolean := false;
  v_used_last_7_days integer := 0;
  v_limit integer := 5;
BEGIN
  IF p_tenant_id IS NULL THEN
    RETURN QUERY SELECT false, 0, false;
    RETURN;
  END IF;

  -- Plus subscription check (tenant role)
  SELECT public.has_active_subscription(p_tenant_id, 'tenant')
    INTO v_is_subscriber;

  -- Count applications submitted by tenant in last 7 days
  SELECT COUNT(*)::int
    INTO v_used_last_7_days
  FROM public.property_applications pa
  WHERE pa.tenant_id = p_tenant_id
    AND pa.created_at >= (now() - interval '7 days');

  IF v_is_subscriber THEN
    RETURN QUERY SELECT true, 9999, true; -- unlimited, but UI shows remaining only for non-subscribers
  ELSE
    RETURN QUERY SELECT (v_used_last_7_days < v_limit),
                         GREATEST(v_limit - v_used_last_7_days, 0),
                         false;
  END IF;
END;
$$;

-- 3) Function to "consume" weekly quota (non-mutating; UI uses it to confirm allowance)
CREATE OR REPLACE FUNCTION public.consume_application_quota(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_can_apply boolean;
  v_remaining integer;
  v_is_subscriber boolean;
BEGIN
  IF p_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT can_apply, remaining_applications, is_subscriber
  INTO v_can_apply, v_remaining, v_is_subscriber
  FROM public.check_application_quota(p_tenant_id);

  RETURN v_can_apply;
END;
$$;

-- 4) Trigger to enforce weekly limit at the database layer (authoritative)
CREATE OR REPLACE FUNCTION public.enforce_weekly_application_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_subscriber boolean := false;
  v_used_last_7_days integer := 0;
  v_limit integer := 5;
BEGIN
  -- Safety: require tenant_id on insert
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id is required for property applications';
  END IF;

  -- Plus tenants are exempt
  SELECT public.has_active_subscription(NEW.tenant_id, 'tenant')
    INTO v_is_subscriber;

  IF v_is_subscriber THEN
    RETURN NEW;
  END IF;

  -- Count tenant applications in the last 7 days
  SELECT COUNT(*)::int
    INTO v_used_last_7_days
  FROM public.property_applications pa
  WHERE pa.tenant_id = NEW.tenant_id
    AND pa.created_at >= (now() - interval '7 days');

  IF v_used_last_7_days >= v_limit THEN
    RAISE EXCEPTION 'WEEKLY_QUOTA_EXCEEDED: You have reached your weekly application limit (5 per 7 days)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_weekly_application_limit
  ON public.property_applications;

CREATE TRIGGER trg_enforce_weekly_application_limit
BEFORE INSERT ON public.property_applications
FOR EACH ROW
EXECUTE FUNCTION public.enforce_weekly_application_limit();

-- 5) Schedule weekly email + in-app notification (Edge Function call)
-- Make sure pg_cron and pg_net are enabled in your project.
-- This runs every Sunday at 00:00 UTC (adjust as needed).
select
  cron.schedule(
    'weekly-application-credits-refresh',
    '0 0 * * 0',
    $$
    select
      net.http_post(
        url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/weekly-application-refresh-notify',
        headers:='{
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"
        }'::jsonb,
        body:='{"source":"cron"}'::jsonb
      );
    $$
  );