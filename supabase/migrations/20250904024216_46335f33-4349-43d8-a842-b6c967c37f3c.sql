-- Enhanced database schema for secure Checkbook integration

-- Add webhook events table for tracking and idempotency
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'checkbook',
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  payload JSONB NOT NULL,
  signature TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate processing
  UNIQUE(source, event_id)
);

-- Add constraint to payouts table for digital_check support
ALTER TABLE public.payouts 
DROP CONSTRAINT IF EXISTS payouts_payout_method_check;

ALTER TABLE public.payouts 
ADD CONSTRAINT payouts_payout_method_check 
CHECK (payout_method IN ('ach', 'check', 'digital_check'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_checkbook_id ON public.payouts(checkbook_payout_id);
CREATE INDEX IF NOT EXISTS idx_payouts_landlord_portfolio ON public.payouts(landlord_id, portfolio_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processing ON public.webhook_events(source, status, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.webhook_events(source, event_id);

-- Add trigger for updated_at
CREATE TRIGGER update_webhook_events_updated_at
  BEFORE UPDATE ON public.webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS on webhook_events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- System can manage webhook events
CREATE POLICY "System can manage webhook events" ON public.webhook_events
  FOR ALL USING (true);

-- Add activity logging trigger for payout status changes
CREATE OR REPLACE FUNCTION public.log_payout_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activity_logs (
      user_id,
      entity_type,
      entity_id,
      action,
      old_values,
      new_values,
      notes
    ) VALUES (
      NEW.user_id,
      'payout',
      NEW.id,
      'status_change',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      format('Payout status changed from %s to %s', OLD.status, NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER payout_status_change_log
  AFTER UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.log_payout_status_change();