-- Create landlord_plaid_transactions table for storing synced Plaid transactions
CREATE TABLE public.landlord_plaid_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_account_id UUID REFERENCES public.user_bank_accounts(id) ON DELETE SET NULL,
  plaid_transaction_id TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  merchant_name TEXT,
  pending BOOLEAN DEFAULT false,
  category TEXT,
  plaid_data JSONB DEFAULT '{}',
  -- Tagging fields
  is_tagged BOOLEAN DEFAULT false,
  tagged_at TIMESTAMPTZ,
  tagged_by UUID REFERENCES auth.users(id),
  tag_type TEXT, -- 'tenant_rent', 'hap_voucher', 'other', 'split'
  linked_rent_payment_id UUID REFERENCES public.rent_payments(id) ON DELETE SET NULL,
  linked_hap_payment_id UUID REFERENCES public.hap_payments(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.property_units(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(landlord_id, plaid_transaction_id)
);

-- Create auto-tag rules table
CREATE TABLE public.landlord_auto_tag_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  match_type TEXT NOT NULL, -- 'description', 'amount', 'merchant', 'combined'
  match_pattern TEXT,
  match_amount_min NUMERIC,
  match_amount_max NUMERIC,
  match_merchant TEXT,
  target_property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  target_unit_id UUID REFERENCES public.property_units(id) ON DELETE SET NULL,
  tag_type TEXT NOT NULL, -- 'tenant_rent', 'hap_voucher', 'other'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create split payment allocations table (for split payments)
CREATE TABLE public.landlord_payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.landlord_plaid_transactions(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.property_units(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  tag_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.landlord_plaid_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_auto_tag_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_payment_splits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for landlord_plaid_transactions
CREATE POLICY "Users can view their own transactions"
ON public.landlord_plaid_transactions FOR SELECT
USING (auth.uid() = landlord_id);

CREATE POLICY "Users can insert their own transactions"
ON public.landlord_plaid_transactions FOR INSERT
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Users can update their own transactions"
ON public.landlord_plaid_transactions FOR UPDATE
USING (auth.uid() = landlord_id);

CREATE POLICY "Users can delete their own transactions"
ON public.landlord_plaid_transactions FOR DELETE
USING (auth.uid() = landlord_id);

-- RLS Policies for landlord_auto_tag_rules
CREATE POLICY "Users can view their own rules"
ON public.landlord_auto_tag_rules FOR SELECT
USING (auth.uid() = landlord_id);

CREATE POLICY "Users can insert their own rules"
ON public.landlord_auto_tag_rules FOR INSERT
WITH CHECK (auth.uid() = landlord_id);

CREATE POLICY "Users can update their own rules"
ON public.landlord_auto_tag_rules FOR UPDATE
USING (auth.uid() = landlord_id);

CREATE POLICY "Users can delete their own rules"
ON public.landlord_auto_tag_rules FOR DELETE
USING (auth.uid() = landlord_id);

-- RLS Policies for landlord_payment_splits
CREATE POLICY "Users can view their own splits"
ON public.landlord_payment_splits FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.landlord_plaid_transactions t 
  WHERE t.id = transaction_id AND t.landlord_id = auth.uid()
));

CREATE POLICY "Users can insert their own splits"
ON public.landlord_payment_splits FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.landlord_plaid_transactions t 
  WHERE t.id = transaction_id AND t.landlord_id = auth.uid()
));

CREATE POLICY "Users can delete their own splits"
ON public.landlord_payment_splits FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.landlord_plaid_transactions t 
  WHERE t.id = transaction_id AND t.landlord_id = auth.uid()
));

-- Indexes for performance
CREATE INDEX idx_landlord_plaid_transactions_landlord ON public.landlord_plaid_transactions(landlord_id);
CREATE INDEX idx_landlord_plaid_transactions_tagged ON public.landlord_plaid_transactions(landlord_id, is_tagged);
CREATE INDEX idx_landlord_plaid_transactions_date ON public.landlord_plaid_transactions(transaction_date DESC);
CREATE INDEX idx_landlord_auto_tag_rules_landlord ON public.landlord_auto_tag_rules(landlord_id);
CREATE INDEX idx_landlord_payment_splits_transaction ON public.landlord_payment_splits(transaction_id);

-- Update timestamp trigger
CREATE TRIGGER update_landlord_plaid_transactions_updated_at
BEFORE UPDATE ON public.landlord_plaid_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_landlord_auto_tag_rules_updated_at
BEFORE UPDATE ON public.landlord_auto_tag_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();