-- 1. Schedule EOD briefing at 9:30 PM ET (01:30 UTC)
SELECT cron.schedule(
  'daily-agent-briefing-930pm-et',
  '30 1 * * *',
  $$
  SELECT net.http_post(
    url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/agent-briefing',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
    body:='{"source":"cron","trigger":"daily-930pm-et"}'::jsonb
  ) as request_id;
  $$
);

-- 2. Database trigger for real-time push status SMS alerts
CREATE OR REPLACE FUNCTION public.notify_push_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(
      url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/push-status-alert',
      headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
      body:=jsonb_build_object(
        'push_id', NEW.id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'tenant_id', NEW.tenant_id,
        'property_id', NEW.property_id,
        'pushed_at', NEW.pushed_at
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_push_status_sms
  AFTER UPDATE ON public.property_pushes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_push_status_change();