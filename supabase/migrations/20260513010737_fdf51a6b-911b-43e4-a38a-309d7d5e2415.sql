
-- =========================================================
-- Step 2: HAP Audit Trail
-- =========================================================

CREATE TABLE IF NOT EXISTS public.hap_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_user_id UUID,
  before JSONB,
  after JSONB,
  changed_fields TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hap_audit_log_entity
  ON public.hap_audit_log(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hap_audit_log_agency
  ON public.hap_audit_log(agency_id, created_at DESC);

ALTER TABLE public.hap_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hap_audit_log_select" ON public.hap_audit_log;
CREATE POLICY "hap_audit_log_select"
  ON public.hap_audit_log FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR public.is_agency_staff(auth.uid(), agency_id)
  );

CREATE OR REPLACE FUNCTION public.log_hap_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity_type TEXT;
  v_agency_id UUID;
  v_entity_id UUID;
  v_action TEXT;
  v_before JSONB;
  v_after JSONB;
  v_changed TEXT[];
  v_actor UUID;
BEGIN
  v_actor := auth.uid();

  IF TG_TABLE_NAME = 'hap_payment_batches' THEN
    v_entity_type := 'batch';
  ELSIF TG_TABLE_NAME = 'hap_batch_items' THEN
    v_entity_type := 'batch_item';
  ELSIF TG_TABLE_NAME = 'hap_disbursements' THEN
    v_entity_type := 'disbursement';
  ELSE
    v_entity_type := TG_TABLE_NAME;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_before := to_jsonb(OLD);
    v_after := NULL;
    v_entity_id := OLD.id;
    v_agency_id := COALESCE(
      (v_before->>'agency_id')::UUID,
      (SELECT agency_id FROM hap_payment_batches WHERE id = (v_before->>'batch_id')::UUID)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'update';
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
    v_entity_id := NEW.id;
    v_agency_id := COALESCE(
      (v_after->>'agency_id')::UUID,
      (SELECT agency_id FROM hap_payment_batches WHERE id = (v_after->>'batch_id')::UUID)
    );
    SELECT array_agg(key) INTO v_changed
    FROM jsonb_each(v_after) a
    WHERE a.value IS DISTINCT FROM (v_before -> a.key);
  ELSE
    v_action := 'insert';
    v_before := NULL;
    v_after := to_jsonb(NEW);
    v_entity_id := NEW.id;
    v_agency_id := COALESCE(
      (v_after->>'agency_id')::UUID,
      (SELECT agency_id FROM hap_payment_batches WHERE id = (v_after->>'batch_id')::UUID)
    );
  END IF;

  IF v_agency_id IS NOT NULL THEN
    INSERT INTO public.hap_audit_log
      (agency_id, entity_type, entity_id, action, actor_user_id, before, after, changed_fields)
    VALUES
      (v_agency_id, v_entity_type, v_entity_id, v_action, v_actor, v_before, v_after, v_changed);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_hap_payment_batches_audit ON public.hap_payment_batches;
CREATE TRIGGER trg_hap_payment_batches_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.hap_payment_batches
  FOR EACH ROW EXECUTE FUNCTION public.log_hap_audit();

DROP TRIGGER IF EXISTS trg_hap_batch_items_audit ON public.hap_batch_items;
CREATE TRIGGER trg_hap_batch_items_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.hap_batch_items
  FOR EACH ROW EXECUTE FUNCTION public.log_hap_audit();

DROP TRIGGER IF EXISTS trg_hap_disbursements_audit ON public.hap_disbursements;
CREATE TRIGGER trg_hap_disbursements_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.hap_disbursements
  FOR EACH ROW EXECUTE FUNCTION public.log_hap_audit();

-- =========================================================
-- Step 3: HAP -> tax_transactions feeder
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_tax_transactions_source_disbursement
  ON public.tax_transactions(original_transaction_id)
  WHERE original_transaction_table = 'hap_disbursements';

CREATE OR REPLACE FUNCTION public.feed_hap_disbursement_to_tax()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay_date DATE;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'paid')
     OR (TG_OP = 'INSERT' AND NEW.status = 'paid') THEN

    IF NEW.landlord_id IS NULL THEN
      RETURN NEW;
    END IF;

    v_pay_date := COALESCE(NEW.paid_at::DATE, CURRENT_DATE);

    INSERT INTO public.tax_transactions (
      payee_id,
      payer_id,
      amount,
      payment_date,
      tax_year,
      transaction_type,
      payment_method,
      description,
      original_transaction_id,
      original_transaction_table,
      form_type,
      created_by
    )
    VALUES (
      NEW.landlord_id,
      NEW.agency_id,
      NEW.amount,
      v_pay_date,
      EXTRACT(YEAR FROM v_pay_date)::INT,
      'hap_payment',
      COALESCE(NEW.payment_method, NEW.rail, 'ach'),
      COALESCE(NEW.memo, 'HAP disbursement'),
      NEW.id,
      'hap_disbursements',
      '1099_misc'::tax_form_type,
      NEW.paid_by
    )
    ON CONFLICT (original_transaction_id) WHERE original_transaction_table = 'hap_disbursements' DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hap_disbursement_tax_feed ON public.hap_disbursements;
CREATE TRIGGER trg_hap_disbursement_tax_feed
  AFTER INSERT OR UPDATE OF status ON public.hap_disbursements
  FOR EACH ROW EXECUTE FUNCTION public.feed_hap_disbursement_to_tax();
