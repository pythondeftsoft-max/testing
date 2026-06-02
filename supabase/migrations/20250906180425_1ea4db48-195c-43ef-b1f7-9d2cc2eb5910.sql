-- Create stripe_connect_accounts table for managing multiple Stripe accounts per user
CREATE TABLE public.stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  business_type TEXT,
  business_name TEXT,
  email TEXT,
  country TEXT DEFAULT 'US',
  currency TEXT DEFAULT 'usd',
  onboarding_complete BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  requirements_pending JSONB DEFAULT '[]'::jsonb,
  external_accounts JSONB DEFAULT '[]'::jsonb,
  payout_schedule JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true
);

-- Enable RLS
ALTER TABLE public.stripe_connect_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own Stripe Connect accounts"
ON public.stripe_connect_accounts
FOR ALL
USING (user_id = auth.uid());

-- Create indexes
CREATE INDEX idx_stripe_connect_accounts_user_id ON public.stripe_connect_accounts(user_id);
CREATE INDEX idx_stripe_connect_accounts_stripe_account_id ON public.stripe_connect_accounts(stripe_account_id);

-- Add property payment routing
ALTER TABLE public.properties 
ADD COLUMN stripe_connect_account_id UUID REFERENCES public.stripe_connect_accounts(id);

-- Add portfolio payment routing  
ALTER TABLE public.portfolios 
ADD COLUMN stripe_connect_account_id UUID REFERENCES public.stripe_connect_accounts(id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_stripe_connect_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stripe_connect_accounts_updated_at
BEFORE UPDATE ON public.stripe_connect_accounts
FOR EACH ROW
EXECUTE FUNCTION update_stripe_connect_accounts_updated_at();