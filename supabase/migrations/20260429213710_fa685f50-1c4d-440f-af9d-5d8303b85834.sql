ALTER TABLE public.pha_prospect_status
  ADD COLUMN IF NOT EXISTS pricing_override jsonb;

COMMENT ON COLUMN public.pha_prospect_status.pricing_override IS
  'Manual quote override: { annual_usd, setup_usd, rationale, set_by, set_at }. NULL = use suggested.';