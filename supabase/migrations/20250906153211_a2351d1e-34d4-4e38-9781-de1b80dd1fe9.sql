
-- 1) Property-level payment settings
CREATE TABLE IF NOT EXISTS public.property_payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL UNIQUE REFERENCES public.properties(id) ON DELETE CASCADE,
  -- Default outbound funding account for Checkbook payouts
  payout_bank_account_id UUID NULL REFERENCES public.user_bank_accounts(id) ON DELETE SET NULL,
  -- Optional: override where tenant payments should land (Stripe Connect account per property)
  receivables_connect_account_id TEXT NULL,
  payout_source TEXT NOT NULL DEFAULT 'checkbook',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_payment_settings ENABLE ROW LEVEL SECURITY;

-- Owners can manage their property settings
CREATE POLICY "Owners manage property payment settings"
ON public.property_payment_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_payment_settings.property_id
      AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_payment_settings.property_id
      AND p.owner_id = auth.uid()
  )
);

-- Portfolio admins/editors manage settings for properties in portfolios they manage
CREATE POLICY "Portfolio managers manage property payment settings"
ON public.property_payment_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_payment_settings.property_id
      AND p.portfolio_id IS NOT NULL
      AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner','editor'])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_payment_settings.property_id
      AND p.portfolio_id IS NOT NULL
      AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner','editor'])
  )
);

-- Viewers can read for managed portfolios; owners can read theirs
CREATE POLICY "Portfolio viewers read property payment settings"
ON public.property_payment_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_payment_settings.property_id
      AND p.portfolio_id IS NOT NULL
      AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner','editor','viewer'])
  )
  OR EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = property_payment_settings.property_id
      AND p.owner_id = auth.uid()
  )
);

-- Keep updated_at current on changes
DROP TRIGGER IF EXISTS trg_property_payment_settings_updated_at ON public.property_payment_settings;
CREATE TRIGGER trg_property_payment_settings_updated_at
BEFORE UPDATE ON public.property_payment_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
