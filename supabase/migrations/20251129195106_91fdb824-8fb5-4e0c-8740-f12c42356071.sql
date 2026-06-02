-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to run auto-assignment every 15 minutes
SELECT cron.schedule(
  'scheduled-auto-assign-every-15-min',
  '*/15 * * * *',  -- Every 15 minutes
  $$
  SELECT
    net.http_post(
      url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/scheduled-auto-assign',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
      body:='{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);