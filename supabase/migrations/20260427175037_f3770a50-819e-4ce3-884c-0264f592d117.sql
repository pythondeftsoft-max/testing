-- Remove any prior scheduling under the same name (safe re-run)
DO $$
DECLARE
  jid BIGINT;
BEGIN
  SELECT jobid INTO jid FROM cron.job WHERE jobname = 'mfa-enrollment-reminder-daily';
  IF jid IS NOT NULL THEN
    PERFORM cron.unschedule(jid);
  END IF;
END $$;

-- Schedule the reminder daily at 09:00 UTC
SELECT cron.schedule(
  'mfa-enrollment-reminder-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/mfa-enrollment-reminder',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  ) AS request_id;
  $$
);