SELECT cron.schedule(
  'daily-agent-briefing-10am-et',
  '0 14 * * *',
  $$
  SELECT net.http_post(
    url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/agent-briefing',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
    body:='{"source":"cron","trigger":"daily-10am-et"}'::jsonb
  ) as request_id;
  $$
);