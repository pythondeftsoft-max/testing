
-- Payment accounts used as selectable "Source Account" when sending payouts

CREATE TABLE IF NOT EXISTS public.payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  portfolio_id UUID NULL,
  label TEXT NOT NULL,                      -- e.g., "Chase Operating"
  bank_name TEXT NULL,                      -- optional display field
  account_last4 TEXT NULL,                  -- optional display field
  checkbook_funding_source_id TEXT NULL,    -- future: tie to Checkbook funding source
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

-- Owners can manage their own accounts
DROP POLICY IF EXISTS "Owners manage their payment accounts" ON public.payment_accounts;
CREATE POLICY "Owners manage their payment accounts"
  ON public.payment_accounts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Portfolio members can READ accounts for portfolios where they hold a role
-- (Owner still always has access)
DROP POLICY IF EXISTS "Portfolio members can view portfolio payment accounts" ON public.payment_accounts;
CREATE POLICY "Portfolio members can view portfolio payment accounts"
  ON public.payment_accounts
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      portfolio_id IS NOT NULL
      AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
    )
  );

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_payment_accounts_user ON public.payment_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_accounts_portfolio ON public.payment_accounts(portfolio_id);

-- Keep updated_at fresh
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_payment_accounts_updated_at'
  ) THEN
    CREATE TRIGGER set_payment_accounts_updated_at
    BEFORE UPDATE ON public.payment_accounts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END$$;
