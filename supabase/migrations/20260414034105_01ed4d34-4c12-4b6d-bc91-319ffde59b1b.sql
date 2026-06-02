
ALTER TABLE public.agency_recertifications
ADD COLUMN IF NOT EXISTS last_reminder_sent timestamptz,
ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0;
