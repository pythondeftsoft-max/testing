-- Add autopay fields to rent_payments table
ALTER TABLE public.rent_payments ADD COLUMN IF NOT EXISTS autopay_enabled boolean DEFAULT false;
ALTER TABLE public.rent_payments ADD COLUMN IF NOT EXISTS autopay_payment_method_id text;
ALTER TABLE public.rent_payments ADD COLUMN IF NOT EXISTS autopay_setup_date timestamp with time zone;
ALTER TABLE public.rent_payments ADD COLUMN IF NOT EXISTS next_autopay_date date;
ALTER TABLE public.rent_payments ADD COLUMN IF NOT EXISTS autopay_status text DEFAULT 'inactive';

-- Add autopay fields to subscriptions table
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS autopay_enabled boolean DEFAULT true;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS autopay_payment_method_id text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS autopay_failures_count integer DEFAULT 0;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS last_autopay_attempt timestamp with time zone;

-- Create autopay_schedules table for rent autopay management
CREATE TABLE IF NOT EXISTS public.autopay_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  payment_method_id text NOT NULL,
  payment_method_type text NOT NULL DEFAULT 'card', -- 'card' or 'ach'
  autopay_day integer NOT NULL DEFAULT 1, -- Day of month (1-28)
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'active', -- active, paused, cancelled, failed
  next_payment_date date NOT NULL,
  failure_count integer DEFAULT 0,
  last_failure_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, property_id)
);

-- Enable RLS on autopay_schedules
ALTER TABLE public.autopay_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for autopay_schedules
CREATE POLICY "Tenants can manage their own autopay schedules" 
ON public.autopay_schedules 
FOR ALL 
USING (tenant_id = auth.uid());

CREATE POLICY "Property owners can view autopay schedules for their properties" 
ON public.autopay_schedules 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.properties 
  WHERE id = autopay_schedules.property_id 
  AND owner_id = auth.uid()
));

-- Create payment_methods table for storing Stripe payment method references
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id text NOT NULL UNIQUE,
  type text NOT NULL, -- 'card' or 'us_bank_account'
  last_four text,
  brand text, -- For cards: visa, mastercard, etc. For ACH: bank name
  is_default boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on payment_methods
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_methods
CREATE POLICY "Users can manage their own payment methods" 
ON public.payment_methods 
FOR ALL 
USING (user_id = auth.uid());

-- Create autopay_transactions table for tracking automated payments
CREATE TABLE IF NOT EXISTS public.autopay_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  autopay_schedule_id uuid NOT NULL REFERENCES public.autopay_schedules(id) ON DELETE CASCADE,
  rent_payment_id uuid REFERENCES public.rent_payments(id),
  stripe_payment_intent_id text,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, succeeded, failed, cancelled
  failure_reason text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on autopay_transactions
ALTER TABLE public.autopay_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for autopay_transactions
CREATE POLICY "Tenants can view their own autopay transactions" 
ON public.autopay_transactions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.autopay_schedules 
  WHERE id = autopay_transactions.autopay_schedule_id 
  AND tenant_id = auth.uid()
));

CREATE POLICY "Property owners can view autopay transactions for their properties" 
ON public.autopay_transactions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.autopay_schedules a
  JOIN public.properties p ON a.property_id = p.id
  WHERE a.id = autopay_transactions.autopay_schedule_id 
  AND p.owner_id = auth.uid()
));

-- Create updated_at trigger for autopay_schedules
CREATE TRIGGER update_autopay_schedules_updated_at
  BEFORE UPDATE ON public.autopay_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for payment_methods
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();