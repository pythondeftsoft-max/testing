-- Add enhanced payment account fields for full bank details support
ALTER TABLE public.payment_accounts 
ADD COLUMN account_holder_name TEXT,
ADD COLUMN account_type TEXT CHECK (account_type IN ('checking', 'savings')),
ADD COLUMN routing_last4 TEXT,
ADD COLUMN link_status TEXT DEFAULT 'linked';

-- Create index for faster lookups by checkbook funding source ID
CREATE INDEX IF NOT EXISTS idx_payment_accounts_checkbook_funding_source_id 
ON public.payment_accounts (checkbook_funding_source_id);

-- Update existing records to have default link_status
UPDATE public.payment_accounts 
SET link_status = 'unlinked' 
WHERE checkbook_funding_source_id IS NULL;

UPDATE public.payment_accounts 
SET link_status = 'linked' 
WHERE checkbook_funding_source_id IS NOT NULL;