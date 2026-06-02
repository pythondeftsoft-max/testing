-- Extend asset_reminder_preferences table with email preferences
ALTER TABLE public.asset_reminder_preferences 
ADD COLUMN email_enabled boolean DEFAULT true,
ADD COLUMN delivery_channel text DEFAULT 'both' CHECK (delivery_channel IN ('in_app','email','both')),
ADD COLUMN preferred_send_hour smallint DEFAULT 9 CHECK (preferred_send_hour >= 0 AND preferred_send_hour <= 23),
ADD COLUMN timezone text DEFAULT 'UTC',
ADD COLUMN digest_interval text DEFAULT 'immediate' CHECK (digest_interval IN ('immediate','daily','weekly')),
ADD COLUMN mute_until date NULL,
ADD COLUMN last_email_sent_at timestamptz NULL;

-- Create reminder_email_logs table
CREATE TABLE public.reminder_email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_id uuid NOT NULL REFERENCES public.asset_reminder_preferences(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('queued','sent','failed')),
  provider_message_id text NULL,
  error_message text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on reminder_email_logs
ALTER TABLE public.reminder_email_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for reminder_email_logs
CREATE POLICY "Users can view their own email logs" 
ON public.reminder_email_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage email logs" 
ON public.reminder_email_logs 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create RPC function to mark reminder as delivered
CREATE OR REPLACE FUNCTION public.mark_reminder_delivered(reminder_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  UPDATE public.asset_reminder_preferences 
  SET reminder_count = reminder_count + 1,
      last_email_sent_at = now(),
      next_reminder_date = public.compute_next_reminder_date(
        COALESCE(last_financial_update, created_at), 
        frequency
      ),
      updated_at = now()
  WHERE id = reminder_id;
END;
$$;

-- Create trigger for updated_at on reminder_email_logs
CREATE TRIGGER update_reminder_email_logs_updated_at
  BEFORE UPDATE ON public.reminder_email_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();