-- Remove the old 9:30 PM cron job that was missing the type parameter
SELECT cron.unschedule(31);

-- Reschedule with the correct nightcap type in the body
SELECT cron.schedule(
  'daily-agent-briefing-930pm-et',
  '30 1 * * *',
  $$
  SELECT net.http_post(
    url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/agent-briefing',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
    body:='{"source":"cron","trigger":"daily-930pm-et","type":"nightcap"}'::jsonb
  ) as request_id;
  $$
);