-- Schedule daily alert digest at 21:00 UTC
SELECT cron.schedule(
  'daily-alert-digest',
  '0 21 * * *', -- 21:00 UTC every day
  $$
  SELECT
    net.http_post(
        url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/alert-digest',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
        body:='{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);

-- Create index for faster alert digest queries
CREATE INDEX IF NOT EXISTS idx_notifications_title_alert_lookup 
ON public.notifications(title) 
WHERE title LIKE 'Alert:%';

-- Create index for user notifications with filters used by notification system
CREATE INDEX IF NOT EXISTS idx_notifications_user_filters 
ON public.notifications(user_id, created_at DESC, read, archived_at, snoozed_until);

-- Create index for optimizing notification count queries
CREATE INDEX IF NOT EXISTS idx_notifications_unread_count 
ON public.notifications(user_id, read, archived_at, snoozed_until) 
WHERE read = false AND archived_at IS NULL;