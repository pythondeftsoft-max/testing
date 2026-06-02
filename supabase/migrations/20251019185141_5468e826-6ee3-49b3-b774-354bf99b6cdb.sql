-- Create landlord_payout_profiles table for saved payment details
CREATE TABLE public.landlord_payout_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  default_payout_method TEXT NOT NULL CHECK (default_payout_method IN ('digital_check', 'ach', 'check')),
  bank_account_id UUID REFERENCES public.payment_accounts(id) ON DELETE SET NULL,
  email TEXT,
  phone TEXT,
  address JSONB, -- {line1, line2, city, state, postal_code, country}
  routing_number TEXT, -- Encrypted for ACH
  account_number TEXT, -- Encrypted for ACH
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(landlord_id, portfolio_id)
);

-- Create bulk_payout_batches table for grouping bulk payouts
CREATE TABLE public.bulk_payout_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  batch_name TEXT NOT NULL,
  statement_date_range TEXT NOT NULL, -- "March 1-31, 2025"
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_payouts INTEGER NOT NULL DEFAULT 0,
  successful_payouts INTEGER NOT NULL DEFAULT 0,
  failed_payouts INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'completed', 'partial', 'failed')),
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bulk_payout_items table for individual payouts in a batch
CREATE TABLE public.bulk_payout_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_id UUID NOT NULL REFERENCES public.bulk_payout_batches(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id),
  payout_profile_id UUID REFERENCES public.landlord_payout_profiles(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL,
  payout_method TEXT NOT NULL CHECK (payout_method IN ('digital_check', 'ach', 'check')),
  recipient_details JSONB NOT NULL, -- Full recipient info for the payout
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  payout_id UUID REFERENCES public.payouts(id) ON DELETE SET NULL,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landlord_payout_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_payout_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_payout_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for landlord_payout_profiles
CREATE POLICY "Landlords can view their own payout profiles"
  ON public.landlord_payout_profiles FOR SELECT
  USING (landlord_id = auth.uid());

CREATE POLICY "Portfolio managers can view payout profiles"
  ON public.landlord_payout_profiles FOR SELECT
  USING (
    portfolio_id IS NOT NULL AND 
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
  );

CREATE POLICY "Portfolio managers can manage payout profiles"
  ON public.landlord_payout_profiles FOR ALL
  USING (
    portfolio_id IS NOT NULL AND 
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  );

CREATE POLICY "Landlords can manage their own payout profiles"
  ON public.landlord_payout_profiles FOR ALL
  USING (landlord_id = auth.uid());

-- RLS Policies for bulk_payout_batches
CREATE POLICY "Batch creators can view their batches"
  ON public.bulk_payout_batches FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Portfolio members can view portfolio batches"
  ON public.bulk_payout_batches FOR SELECT
  USING (
    portfolio_id IS NOT NULL AND 
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
  );

CREATE POLICY "Portfolio managers can manage batches"
  ON public.bulk_payout_batches FOR ALL
  USING (
    portfolio_id IS NOT NULL AND 
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  );

-- RLS Policies for bulk_payout_items
CREATE POLICY "Portfolio members can view batch items"
  ON public.bulk_payout_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bulk_payout_batches b
      WHERE b.id = batch_id 
      AND b.portfolio_id IS NOT NULL
      AND has_portfolio_role(b.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
    )
  );

CREATE POLICY "Landlords can view their own payout items"
  ON public.bulk_payout_items FOR SELECT
  USING (landlord_id = auth.uid());

CREATE POLICY "Portfolio managers can manage batch items"
  ON public.bulk_payout_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.bulk_payout_batches b
      WHERE b.id = batch_id 
      AND b.portfolio_id IS NOT NULL
      AND has_portfolio_role(b.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
    )
  );

-- Create indexes for performance
CREATE INDEX idx_landlord_payout_profiles_landlord ON public.landlord_payout_profiles(landlord_id);
CREATE INDEX idx_landlord_payout_profiles_portfolio ON public.landlord_payout_profiles(portfolio_id);
CREATE INDEX idx_bulk_payout_batches_portfolio ON public.bulk_payout_batches(portfolio_id);
CREATE INDEX idx_bulk_payout_batches_created_by ON public.bulk_payout_batches(created_by);
CREATE INDEX idx_bulk_payout_items_batch ON public.bulk_payout_items(batch_id);
CREATE INDEX idx_bulk_payout_items_landlord ON public.bulk_payout_items(landlord_id);
CREATE INDEX idx_bulk_payout_items_status ON public.bulk_payout_items(status);

-- Trigger to update updated_at
CREATE TRIGGER update_landlord_payout_profiles_updated_at
  BEFORE UPDATE ON public.landlord_payout_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_bulk_payout_batches_updated_at
  BEFORE UPDATE ON public.bulk_payout_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_bulk_payout_items_updated_at
  BEFORE UPDATE ON public.bulk_payout_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();