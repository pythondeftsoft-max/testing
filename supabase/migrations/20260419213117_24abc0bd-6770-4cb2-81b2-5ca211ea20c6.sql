-- Remove existing job with same name (if any) so this is idempotent
DO $$
BEGIN
  PERFORM cron.unschedule('monthly-semap-snapshot');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Schedule monthly snapshot: 1st of each month at 06:00 UTC
SELECT cron.schedule(
  'monthly-semap-snapshot',
  '0 6 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/snapshot-semap-monthly',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  ) AS request_id;
  $$
);