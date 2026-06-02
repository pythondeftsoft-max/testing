-- Add subscription autopay columns to subscriptions table
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS autopay_payment_method_id text,
ADD COLUMN IF NOT EXISTS autopay_failures_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_autopay_attempt timestamp with time zone,
ADD COLUMN IF NOT EXISTS autopay_enabled boolean DEFAULT false;

-- Create subscription autopay schedules table
CREATE TABLE IF NOT EXISTS public.subscription_autopay_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  payment_method_id text NOT NULL,
  payment_method_type text NOT NULL DEFAULT 'card',
  renewal_day integer NOT NULL DEFAULT 1,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'active',
  next_renewal_date date NOT NULL,
  failure_count integer DEFAULT 0,
  last_failure_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on subscription autopay schedules
ALTER TABLE public.subscription_autopay_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for subscription autopay schedules
CREATE POLICY "Users can manage their own subscription autopay schedules" 
ON public.subscription_autopay_schedules 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE subscriptions.id = subscription_autopay_schedules.subscription_id 
    AND subscriptions.user_id = auth.uid()
  )
);

-- Create autopay transactions tracking table
CREATE TABLE IF NOT EXISTS public.subscription_autopay_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autopay_schedule_id uuid NOT NULL REFERENCES public.subscription_autopay_schedules(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  stripe_payment_intent_id text,
  failure_reason text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on subscription autopay transactions
ALTER TABLE public.subscription_autopay_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for subscription autopay transactions
CREATE POLICY "Users can view their own subscription autopay transactions" 
ON public.subscription_autopay_transactions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.subscription_autopay_schedules sas
    JOIN public.subscriptions s ON sas.subscription_id = s.id
    WHERE sas.id = subscription_autopay_transactions.autopay_schedule_id 
    AND s.user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_subscription_autopay_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_subscription_autopay_schedules_updated_at
BEFORE UPDATE ON public.subscription_autopay_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_subscription_autopay_updated_at();