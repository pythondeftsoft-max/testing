-- Add retry tracking columns to bulk_payout_items
ALTER TABLE public.bulk_payout_items
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failure_category TEXT CHECK (failure_category IN ('transient', 'permanent', 'unknown'));

CREATE INDEX IF NOT EXISTS idx_bulk_payout_items_next_retry
  ON public.bulk_payout_items(next_retry_at)
  WHERE status = 'failed' AND next_retry_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bulk_payout_items_failure_category
  ON public.bulk_payout_items(failure_category)
  WHERE status = 'failed';

COMMENT ON COLUMN public.bulk_payout_items.retry_count IS 'Number of times this payout has been retried (manual or automatic).';
COMMENT ON COLUMN public.bulk_payout_items.failure_category IS 'transient = auto-retry eligible (network/5xx); permanent = needs human (bad recipient/insufficient funds).';
COMMENT ON COLUMN public.bulk_payout_items.next_retry_at IS 'When the auto-retry cron should attempt this item again. NULL = no auto-retry queued.';