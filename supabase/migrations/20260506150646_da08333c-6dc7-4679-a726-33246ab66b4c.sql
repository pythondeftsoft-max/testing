-- 1. Extend reminder_type enum (additive)
ALTER TYPE reminder_type ADD VALUE IF NOT EXISTS 'voucher_issued';
ALTER TYPE reminder_type ADD VALUE IF NOT EXISTS 'rent_change';
ALTER TYPE reminder_type ADD VALUE IF NOT EXISTS 'document_expiration';

-- 2. Replace single (agency_id, reminder_type) unique with stackable (agency_id, reminder_type, days_before)
ALTER TABLE public.agency_automated_reminders
  DROP CONSTRAINT IF EXISTS agency_automated_reminders_agency_id_reminder_type_key;

CREATE UNIQUE INDEX IF NOT EXISTS agency_automated_reminders_agency_type_days_uniq
  ON public.agency_automated_reminders (agency_id, reminder_type, days_before);

-- 3. Schedule daily reminder cron (8am UTC)
SELECT cron.unschedule('agency-send-reminders-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'agency-send-reminders-daily');

SELECT cron.schedule(
  'agency-send-reminders-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/agency-send-reminders',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);