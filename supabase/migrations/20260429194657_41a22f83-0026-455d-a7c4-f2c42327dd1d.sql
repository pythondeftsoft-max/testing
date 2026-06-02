ALTER TABLE public.pha_enrichment
  ADD COLUMN IF NOT EXISTS estimated_admin_budget_fallback numeric,
  ADD COLUMN IF NOT EXISTS saas_wallet_low_fallback numeric,
  ADD COLUMN IF NOT EXISTS saas_wallet_high_fallback numeric;

CREATE OR REPLACE FUNCTION public.compute_pha_saas_wallet_fallback()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_units integer;
  v_budget numeric;
BEGIN
  v_units := COALESCE(NULLIF(NEW.authorized_units, 0), NULLIF(NEW.leased_units, 0));

  IF v_units IS NOT NULL AND v_units > 0 THEN
    v_budget := v_units * 85 * 12;
    NEW.estimated_admin_budget_fallback := v_budget;
    NEW.saas_wallet_low_fallback := round(v_budget * 0.02, 2);
    NEW.saas_wallet_high_fallback := round(v_budget * 0.06, 2);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_pha_saas_wallet_fallback ON public.pha_enrichment;
CREATE TRIGGER trg_compute_pha_saas_wallet_fallback
  BEFORE INSERT OR UPDATE
  ON public.pha_enrichment
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_pha_saas_wallet_fallback();

UPDATE public.pha_enrichment SET pha_code = pha_code WHERE id IS NOT NULL;