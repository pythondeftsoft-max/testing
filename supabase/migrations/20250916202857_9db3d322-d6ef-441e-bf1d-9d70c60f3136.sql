-- Add missing financial fields to properties table for Property Statement reporting
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS beginning_cash_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS ending_cash_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS owner_contributions numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS owner_draws numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_deposits_held numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS property_reserve numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_income numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_expenses numeric DEFAULT 0;

-- Create property_cash_flow table for tracking detailed cash flow transactions
CREATE TABLE IF NOT EXISTS public.property_cash_flow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL, -- 'receipt' or 'disbursement'
  category TEXT NOT NULL, -- 'rental_income', 'other_income', 'security_deposit', 'owner_contribution', 'operating_expense', 'mortgage_payment', 'owner_draw', 'other_disbursement'
  amount NUMERIC NOT NULL,
  description TEXT,
  reference_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on property_cash_flow table
ALTER TABLE public.property_cash_flow ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for property_cash_flow
CREATE POLICY "Property owners can manage their cash flow transactions"
ON public.property_cash_flow
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = property_cash_flow.property_id 
    AND (
      properties.owner_id = auth.uid() 
      OR (properties.portfolio_id IS NOT NULL AND has_portfolio_role(properties.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]))
    )
  )
);

-- Create policy for viewers to see cash flow data
CREATE POLICY "Portfolio viewers can view cash flow transactions"
ON public.property_cash_flow
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.properties 
    WHERE properties.id = property_cash_flow.property_id 
    AND (
      properties.owner_id = auth.uid() 
      OR (properties.portfolio_id IS NOT NULL AND has_portfolio_role(properties.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]))
    )
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_property_cash_flow_updated_at
BEFORE UPDATE ON public.property_cash_flow
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_property_cash_flow_property_id ON public.property_cash_flow(property_id);
CREATE INDEX IF NOT EXISTS idx_property_cash_flow_transaction_date ON public.property_cash_flow(transaction_date);
CREATE INDEX IF NOT EXISTS idx_property_cash_flow_category ON public.property_cash_flow(category);