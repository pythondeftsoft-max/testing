CREATE OR REPLACE FUNCTION public.sync_special_claim_on_disbursement_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS DISTINCT FROM 'paid') THEN
    UPDATE public.agency_special_claims sc
    SET status = 'paid', paid_date = NEW.paid_at::date
    FROM public.hap_batch_items bi
    WHERE bi.batch_id = NEW.batch_id
      AND bi.landlord_id = NEW.landlord_id
      AND bi.item_type = 'special_claim'
      AND bi.source_claim_id = sc.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_special_claim_on_paid ON public.hap_disbursements;
CREATE TRIGGER trg_sync_special_claim_on_paid
AFTER UPDATE ON public.hap_disbursements
FOR EACH ROW EXECUTE FUNCTION public.sync_special_claim_on_disbursement_paid();