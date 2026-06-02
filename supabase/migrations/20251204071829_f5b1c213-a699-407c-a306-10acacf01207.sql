-- Add plaid_transaction_id to rent_payments for linking tagged deposits
ALTER TABLE public.rent_payments 
ADD COLUMN IF NOT EXISTS plaid_transaction_id text,
ADD COLUMN IF NOT EXISTS matched_via_plaid boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS plaid_split_id uuid;

-- Add index for quick lookups
CREATE INDEX IF NOT EXISTS idx_rent_payments_plaid_transaction_id 
ON public.rent_payments(plaid_transaction_id) WHERE plaid_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rent_payments_plaid_split_id 
ON public.rent_payments(plaid_split_id) WHERE plaid_split_id IS NOT NULL;

-- Add plaid_split_id to hap_payments for linking to landlord_payment_splits
ALTER TABLE public.hap_payments 
ADD COLUMN IF NOT EXISTS plaid_split_id uuid;

CREATE INDEX IF NOT EXISTS idx_hap_payments_plaid_split_id 
ON public.hap_payments(plaid_split_id) WHERE plaid_split_id IS NOT NULL;