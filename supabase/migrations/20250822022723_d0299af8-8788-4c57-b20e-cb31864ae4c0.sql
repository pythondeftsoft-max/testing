-- Create asset_payment_transactions table to track all payment attempts and completions
CREATE TABLE public.asset_payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.portfolio_assets(id) ON DELETE CASCADE,
  payer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recurring_charge_id UUID REFERENCES public.asset_recurring_charges(id) ON DELETE SET NULL,
  
  -- Payment details
  amount NUMERIC(10,2) NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT, -- 'stripe', 'bank_transfer', etc.
  
  -- Stripe specific fields
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_session_id TEXT,
  
  -- Status and timing
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed, cancelled
  transaction_type TEXT NOT NULL DEFAULT 'rent_payment', -- rent_payment, deposit, fee, etc.
  
  -- Payment period (for rent payments)
  payment_period_start DATE,
  payment_period_end DATE,
  
  -- Metadata and audit
  metadata JSONB DEFAULT '{}',
  payment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Additional fields for tracking
  failure_reason TEXT,
  refund_amount NUMERIC(10,2),
  refund_date TIMESTAMPTZ,
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.asset_payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_payment_transactions
CREATE POLICY "Users can view their own payment transactions" 
ON public.asset_payment_transactions 
FOR SELECT 
USING (payer_user_id = auth.uid());

CREATE POLICY "Users can create their own payment transactions" 
ON public.asset_payment_transactions 
FOR INSERT 
WITH CHECK (payer_user_id = auth.uid());

CREATE POLICY "Asset managers can view transactions for their assets" 
ON public.asset_payment_transactions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.portfolio_assets pa
    JOIN public.portfolios p ON pa.portfolio_id = p.id
    WHERE pa.id = asset_payment_transactions.asset_id 
    AND (p.manager_id = auth.uid() OR has_portfolio_role(p.id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]))
  )
);

CREATE POLICY "System can manage payment transactions" 
ON public.asset_payment_transactions 
FOR ALL 
USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_asset_payment_transactions_updated_at
  BEFORE UPDATE ON public.asset_payment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add indexes for performance
CREATE INDEX idx_asset_payment_transactions_asset_id ON public.asset_payment_transactions(asset_id);
CREATE INDEX idx_asset_payment_transactions_payer_user_id ON public.asset_payment_transactions(payer_user_id);
CREATE INDEX idx_asset_payment_transactions_status ON public.asset_payment_transactions(status);
CREATE INDEX idx_asset_payment_transactions_stripe_payment_intent_id ON public.asset_payment_transactions(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- Enhance portfolio_asset_invitations table with lifecycle improvements
ALTER TABLE public.portfolio_asset_invitations 
ADD COLUMN IF NOT EXISTS resent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_resent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS auto_expired_at TIMESTAMPTZ;

-- Add function to auto-expire old invitations
CREATE OR REPLACE FUNCTION public.auto_expire_asset_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE public.portfolio_asset_invitations 
  SET status = 'expired',
      auto_expired_at = now(),
      updated_at = now()
  WHERE status = 'pending' 
    AND expires_at < now()
    AND auto_expired_at IS NULL;
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  RETURN expired_count;
END;
$$;