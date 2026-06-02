-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create index for fast reminder email log retrieval
CREATE INDEX IF NOT EXISTS idx_reminder_email_logs_reminder_sent 
ON reminder_email_logs(reminder_id, sent_at DESC);

-- Create cron job to process asset reminders every hour
SELECT cron.schedule(
  'process-asset-reminders-hourly',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/process-asset-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
        body:=concat('{"scheduled": true, "triggeredAt": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);