-- Create asset autopay schedules table for tenant autopay reminders
CREATE TABLE public.asset_autopay_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  asset_id UUID NOT NULL,
  autopay_day INTEGER NOT NULL DEFAULT 1,
  amount NUMERIC NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  next_payment_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_failure_reason TEXT,
  payment_method_id TEXT,
  payment_method_type TEXT NOT NULL DEFAULT 'card',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_autopay_schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Tenants can manage their own autopay schedules" 
ON public.asset_autopay_schedules 
FOR ALL 
USING (tenant_id = auth.uid());

CREATE POLICY "Portfolio managers can view autopay schedules for their assets" 
ON public.asset_autopay_schedules 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.portfolio_assets pa
    WHERE pa.id = asset_autopay_schedules.asset_id
    AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_asset_autopay_schedules_updated_at
BEFORE UPDATE ON public.asset_autopay_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();