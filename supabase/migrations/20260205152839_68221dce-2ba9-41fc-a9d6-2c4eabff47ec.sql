-- Schedule the match queue processor to run every 5 minutes
SELECT cron.schedule(
  'process-match-queue',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/compute-match-queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
    body := '{"batch_size": 50}'::jsonb
  ) AS request_id;
  $$
);