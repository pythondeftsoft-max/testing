-- Compute SaaS wallet from available enrichment signals.
-- Cascade: real annual expenses > admin_fee × authorized_units × 12 > national avg ($85 × units × 12)
CREATE OR REPLACE FUNCTION public.compute_pha_saas_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_budget numeric;
  v_units integer;
  v_fee numeric;
BEGIN
  v_units := COALESCE(NEW.authorized_units, NEW.leased_units);
  v_fee := COALESCE(NEW.admin_fee_col_a, NEW.admin_fee_col_b);

  -- 1. If we have a real budget number from HUD ArcGIS annual_expenses, prefer it.
  IF NEW.estimated_admin_budget_annual IS NOT NULL AND NEW.estimated_admin_budget_annual > 0 THEN
    v_budget := NEW.estimated_admin_budget_annual;
  -- 2. Else compute from admin fee schedule × units × 12 months
  ELSIF v_units IS NOT NULL AND v_units > 0 AND v_fee IS NOT NULL AND v_fee > 0 THEN
    v_budget := v_units * v_fee * 12;
    NEW.estimated_admin_budget_annual := v_budget;
  -- 3. Else fall back to national average admin fee ($85/unit/month) × units × 12
  ELSIF v_units IS NOT NULL AND v_units > 0 THEN
    v_budget := v_units * 85 * 12;
    NEW.estimated_admin_budget_annual := v_budget;
  ELSE
    v_budget := NULL;
  END IF;

  IF v_budget IS NOT NULL AND v_budget > 0 THEN
    NEW.saas_wallet_low := round(v_budget * 0.02, 2);
    NEW.saas_wallet_high := round(v_budget * 0.06, 2);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_pha_saas_wallet ON public.pha_enrichment;
CREATE TRIGGER trg_compute_pha_saas_wallet
  BEFORE INSERT OR UPDATE OF authorized_units, leased_units, admin_fee_col_a, admin_fee_col_b, estimated_admin_budget_annual
  ON public.pha_enrichment
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_pha_saas_wallet();

-- Backfill: touch every existing row so the trigger fires
UPDATE public.pha_enrichment
SET updated_at = now()
WHERE estimated_admin_budget_annual IS NOT NULL
   OR authorized_units IS NOT NULL
   OR leased_units IS NOT NULL;

-- Force trigger fire on rows where only units exist (fallback path)
UPDATE public.pha_enrichment
SET authorized_units = authorized_units
WHERE authorized_units IS NOT NULL OR leased_units IS NOT NULL;