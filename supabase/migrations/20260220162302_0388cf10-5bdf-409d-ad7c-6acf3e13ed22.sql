
ALTER TABLE public.self_reported_rent
  ADD COLUMN IF NOT EXISTS plaid_transaction_id text,
  ADD COLUMN IF NOT EXISTS plaid_transaction_data jsonb;
