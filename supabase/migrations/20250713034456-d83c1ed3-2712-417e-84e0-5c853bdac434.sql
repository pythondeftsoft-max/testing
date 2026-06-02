-- Create webhook_events table if it doesn't exist properly
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  error_message TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on webhook_events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to view webhook events
CREATE POLICY "Admins can view webhook events" ON public.webhook_events
FOR SELECT
USING (is_admin(auth.uid()));

-- Create policy for system to insert webhook events
CREATE POLICY "System can insert webhook events" ON public.webhook_events
FOR INSERT
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_webhook_events_updated_at
BEFORE UPDATE ON public.webhook_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();