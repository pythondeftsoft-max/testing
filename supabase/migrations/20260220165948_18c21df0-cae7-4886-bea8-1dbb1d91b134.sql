
-- Create tenant_plaid_transactions table to cache outgoing (debit) transactions for tenants
CREATE TABLE public.tenant_plaid_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bank_account_id uuid REFERENCES public.user_bank_accounts(id) ON DELETE CASCADE,
  plaid_transaction_id text UNIQUE NOT NULL,
  transaction_date date NOT NULL,
  amount numeric(10,2) NOT NULL, -- positive = money leaving (debit)
  description text,
  merchant_name text,
  pending boolean DEFAULT false,
  plaid_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indices for fast queries
CREATE INDEX idx_tenant_plaid_transactions_user_id ON public.tenant_plaid_transactions(user_id);
CREATE INDEX idx_tenant_plaid_transactions_transaction_date ON public.tenant_plaid_transactions(transaction_date DESC);
CREATE INDEX idx_tenant_plaid_transactions_bank_account_id ON public.tenant_plaid_transactions(bank_account_id);

-- Enable RLS
ALTER TABLE public.tenant_plaid_transactions ENABLE ROW LEVEL SECURITY;

-- Tenants can only read their own transactions
CREATE POLICY "Users can view their own tenant transactions"
  ON public.tenant_plaid_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert/update (edge functions use service role)
CREATE POLICY "Service role can manage tenant transactions"
  ON public.tenant_plaid_transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);
