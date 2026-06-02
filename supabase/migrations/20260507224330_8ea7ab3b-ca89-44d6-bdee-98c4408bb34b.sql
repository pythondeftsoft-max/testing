ALTER TABLE public.hap_batch_items
  ADD COLUMN IF NOT EXISTS stop_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS stop_status text,
  ADD COLUMN IF NOT EXISTS stop_requested_by uuid;