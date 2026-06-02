do $$
begin
  perform cron.unschedule('reconcile-placement-fee-payments-15min');
exception when others then null;
end $$;

select cron.schedule(
  'reconcile-placement-fee-payments-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/reconcile-placement-fee-payments',
    headers:='{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);