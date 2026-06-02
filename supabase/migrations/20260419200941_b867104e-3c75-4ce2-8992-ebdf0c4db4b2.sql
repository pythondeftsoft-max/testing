
-- Add auto-batch columns to housing_authorities
ALTER TABLE public.housing_authorities
  ADD COLUMN IF NOT EXISTS auto_batch_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_batch_day_of_month integer NOT NULL DEFAULT 25 CHECK (auto_batch_day_of_month BETWEEN 1 AND 28);

-- Log table for visibility into auto-generation runs
CREATE TABLE IF NOT EXISTS public.auto_batch_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  agency_id uuid NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.hap_payment_batches(id) ON DELETE SET NULL,
  period_month date,
  status text NOT NULL CHECK (status IN ('success', 'skipped_existing', 'skipped_no_contracts', 'error')),
  contracts_count integer NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_batch_log_agency ON public.auto_batch_generation_log(agency_id, run_at DESC);

ALTER TABLE public.auto_batch_generation_log ENABLE ROW LEVEL SECURITY;

-- Agency staff can read their own logs
CREATE POLICY "Agency staff can view their auto-batch logs"
  ON public.auto_batch_generation_log
  FOR SELECT
  TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

-- Only service role inserts (edge function)
CREATE POLICY "Service role can insert auto-batch logs"
  ON public.auto_batch_generation_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);
