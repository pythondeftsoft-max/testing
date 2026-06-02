-- Create pg_cron job to dispatch welcome email sequence hourly
-- Requires pg_cron + pg_net extensions (already enabled in this project)

SELECT cron.schedule(
  'send-welcome-email-sequence-hourly',
  '0 * * * *', -- every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/send-welcome-email-sequence',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
    body := '{"trigger": "cron"}'::jsonb
  );
  $$
);