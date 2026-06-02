
-- Extend payouts to support "record expense now, send later" and richer display

-- 1) New columns (safe to run multiple times with IF NOT EXISTS patterns using DO blocks)
DO $$
BEGIN
  -- property link
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='payouts' AND column_name='property_id'
  ) THEN
    ALTER TABLE public.payouts
      ADD COLUMN property_id uuid NULL REFERENCES public.properties(id) ON DELETE SET NULL;
  END IF;

  -- user-entered memo for the payable
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='payouts' AND column_name='memo'
  ) THEN
    ALTER TABLE public.payouts
      ADD COLUMN memo text NULL;
  END IF;

  -- “Account” column content from the screenshot: source account label
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='payouts' AND column_name='source_account_name'
  ) THEN
    ALTER TABLE public.payouts
      ADD COLUMN source_account_name text NULL;
  END IF;

  -- optional internal id if we later integrate true bank connections
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='payouts' AND column_name='source_account_id'
  ) THEN
    ALTER TABLE public.payouts
      ADD COLUMN source_account_id text NULL;
  END IF;

  -- due date shown in the table next to the account
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='payouts' AND column_name='due_date'
  ) THEN
    ALTER TABLE public.payouts
      ADD COLUMN due_date date NULL;
  END IF;

  -- timestamps for lifecycle controls
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='payouts' AND column_name='sent_at'
  ) THEN
    ALTER TABLE public.payouts
      ADD COLUMN sent_at timestamptz NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='payouts' AND column_name='canceled_at'
  ) THEN
    ALTER TABLE public.payouts
      ADD COLUMN canceled_at timestamptz NULL;
  END IF;
END$$;

-- 2) Amount must be positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payouts_total_amount_positive'
  ) THEN
    ALTER TABLE public.payouts
      ADD CONSTRAINT payouts_total_amount_positive CHECK (total_amount > 0);
  END IF;
END$$;

-- 3) Helpful indexes for filtering/searching
CREATE INDEX IF NOT EXISTS idx_payouts_landlord_status ON public.payouts (landlord_id, status);
CREATE INDEX IF NOT EXISTS idx_payouts_portfolio ON public.payouts (portfolio_id);
CREATE INDEX IF NOT EXISTS idx_payouts_property ON public.payouts (property_id);
CREATE INDEX IF NOT EXISTS idx_payouts_due_date ON public.payouts (due_date);

-- 4) Keep updated_at fresh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_payouts_updated_at'
  ) THEN
    CREATE TRIGGER set_payouts_updated_at
    BEFORE UPDATE ON public.payouts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END$$;
