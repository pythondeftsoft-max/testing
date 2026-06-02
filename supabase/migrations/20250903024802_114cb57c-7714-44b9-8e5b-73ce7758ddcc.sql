-- Create subscription cancellation requests table for auto-cancellation
CREATE TABLE public.subscription_cancellation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  application_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.subscription_cancellation_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admin can view all cancellation requests" ON public.subscription_cancellation_requests
FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "System can manage cancellation requests" ON public.subscription_cancellation_requests
FOR ALL USING (true);

-- Create index for efficient processing
CREATE INDEX idx_subscription_cancellation_requests_status_created 
ON public.subscription_cancellation_requests (status, created_at) 
WHERE status = 'pending';

-- Create trigger function to auto-enqueue subscription cancellations when tenant application is approved
CREATE OR REPLACE FUNCTION public.enqueue_subscription_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Check if tenant has active subscription
    IF EXISTS(
      SELECT 1 FROM public.subscriptions 
      WHERE user_id = NEW.tenant_id 
        AND role = 'tenant'
        AND status = 'active'
        AND (current_period_end IS NULL OR current_period_end > NOW())
    ) THEN
      -- Insert cancellation request
      INSERT INTO public.subscription_cancellation_requests (
        tenant_id,
        application_id,
        status
      ) VALUES (
        NEW.tenant_id,
        NEW.id,
        'pending'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on property_applications
CREATE TRIGGER enqueue_subscription_cancellation_trigger
  AFTER INSERT OR UPDATE OF status ON public.property_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_subscription_cancellation();