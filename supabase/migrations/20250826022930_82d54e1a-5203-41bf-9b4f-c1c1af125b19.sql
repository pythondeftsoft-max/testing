-- Add missing digest_day_of_week column to asset_reminder_preferences table
ALTER TABLE public.asset_reminder_preferences 
ADD COLUMN digest_day_of_week SMALLINT CHECK (digest_day_of_week >= 0 AND digest_day_of_week <= 6);

-- Set up cron job to process email queue every 5 minutes
SELECT cron.schedule(
  'process-email-queue',
  '*/5 * * * *', -- every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/process-email-queue',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
        body:=concat('{"scheduled": true, "triggeredAt": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Set up cron job to process digest reminders daily at 8 AM UTC
SELECT cron.schedule(
  'process-asset-digest-reminders',
  '0 8 * * *', -- daily at 8 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/process-asset-digest-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
        body:=concat('{"scheduled": true, "triggeredAt": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);