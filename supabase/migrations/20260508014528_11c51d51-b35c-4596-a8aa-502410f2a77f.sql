
ALTER TABLE public.agency_invoices
  ADD COLUMN IF NOT EXISTS public_token text UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  ADD COLUMN IF NOT EXISTS paid_method text,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_agency_invoices_public_token ON public.agency_invoices(public_token);

ALTER TABLE public.agency_contracts
  ADD COLUMN IF NOT EXISTS last_invoice_id uuid,
  ADD COLUMN IF NOT EXISTS billing_day_of_month integer NOT NULL DEFAULT 1;
