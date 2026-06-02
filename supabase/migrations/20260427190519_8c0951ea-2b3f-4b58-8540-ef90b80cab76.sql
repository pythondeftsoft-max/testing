-- Schedule daily HUD compliance jobs:
-- 1) retention-purge-daily (dry-run by default; flip dry_run=false in body to enforce)
-- 2) pii-anomaly-scan (creates draft security incidents on threshold breaches)

-- Unschedule prior versions if re-running
DO $$
BEGIN
  PERFORM cron.unschedule('retention-purge-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('pii-anomaly-scan-daily');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'retention-purge-daily',
  '15 3 * * *',  -- 03:15 UTC daily
  $$
  SELECT net.http_post(
    url := 'https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/retention-purge-daily',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
    body := '{"dry_run": true}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'pii-anomaly-scan-daily',
  '30 3 * * *',  -- 03:30 UTC daily
  $$
  SELECT net.http_post(
    url := 'https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/pii-anomaly-scan',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);