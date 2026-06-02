DROP TRIGGER IF EXISTS trg_compute_pha_saas_wallet ON public.pha_enrichment;

CREATE TRIGGER trg_compute_pha_saas_wallet
  BEFORE INSERT OR UPDATE
  ON public.pha_enrichment
  FOR EACH ROW
  EXECUTE FUNCTION public.compute_pha_saas_wallet();

-- Force trigger fire on every row
UPDATE public.pha_enrichment SET pha_code = pha_code;