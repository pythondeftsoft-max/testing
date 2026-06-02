
-- Phase 7: Digest Emails — DB updates and scheduling

-- Ensure required extensions exist (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1) Add weekly digest day-of-week to asset_reminder_preferences
--    0 = Sunday ... 6 = Saturday; only used when digest_interval = 'weekly'
ALTER TABLE public.asset_reminder_preferences
  ADD COLUMN IF NOT EXISTS digest_day_of_week SMALLINT;

COMMENT ON COLUMN public.asset_reminder_preferences.digest_day_of_week
  IS 'Day of week for weekly digests: 0=Sunday, 1=Monday, ... 6=Saturday';

-- Validate the allowed range (idempotent creation of constraint)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'asset_reminder_preferences_digest_day_of_week_valid'
  ) THEN
    ALTER TABLE public.asset_reminder_preferences
      ADD CONSTRAINT asset_reminder_preferences_digest_day_of_week_valid
      CHECK (
        digest_day_of_week IS NULL OR (digest_day_of_week >= 0 AND digest_day_of_week <= 6)
      );
  END IF;
END
$$;

-- Helpful index to quickly find digest candidates by schedule window
-- Only consider email-enabled and not-muted rows, and email-capable channels
CREATE INDEX IF NOT EXISTS idx_arp_digest_schedule
ON public.asset_reminder_preferences (digest_interval, timezone, preferred_send_hour)
WHERE
  email_enabled = true
  AND (delivery_channel IN ('email','both'))
  AND (mute_until IS NULL OR mute_until < now());

-- 2) Group email logs by digest batch
ALTER TABLE public.reminder_email_logs
  ADD COLUMN IF NOT EXISTS batch_id UUID;

-- Index for fast lookup by batch
CREATE INDEX IF NOT EXISTS idx_reminder_email_logs_batch
  ON public.reminder_email_logs (batch_id)
  WHERE batch_id IS NOT NULL;

-- 3) Schedule hourly digest processing (staggered at minute 5 to avoid clashes)
-- Calls the process-asset-digest-reminders Edge Function
SELECT cron.schedule(
  'process-asset-digest-reminders-hourly',
  '5 * * * *', -- every hour at minute 5
  $$
  SELECT
    net.http_post(
      url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/process-asset-digest-reminders',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
      body:=jsonb_build_object('scheduled', true, 'triggeredAt', now())
    ) AS request_id;
  $$
);
