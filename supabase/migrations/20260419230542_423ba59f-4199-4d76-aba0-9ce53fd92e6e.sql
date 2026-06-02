-- Session 6: schedule cron jobs (extensions already enabled)

SELECT cron.unschedule('process-inspection-cure-deadlines-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-inspection-cure-deadlines-daily');

SELECT cron.schedule(
  'process-inspection-cure-deadlines-daily',
  '15 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/process-inspection-cure-deadlines',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.unschedule('auto-schedule-annual-inspections-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-schedule-annual-inspections-daily');

SELECT cron.schedule(
  'auto-schedule-annual-inspections-daily',
  '30 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/auto-schedule-annual-inspections',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

SELECT cron.unschedule('process-portability-billing-monthly')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-portability-billing-monthly');

SELECT cron.schedule(
  'process-portability-billing-monthly',
  '0 7 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/process-portability-billing',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);