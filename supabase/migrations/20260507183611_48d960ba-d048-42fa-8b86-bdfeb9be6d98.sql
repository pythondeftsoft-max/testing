
-- Ledger
CREATE TABLE public.hap_disbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.hap_payment_batches(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL,
  landlord_id UUID,
  unit_id UUID,
  tenant_id UUID,
  period_month DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  rail TEXT NOT NULL CHECK (rail IN ('nacha','manual','ap_export')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','bounced','voided')),
  reference_number TEXT,
  payment_method TEXT,
  memo TEXT,
  paid_at TIMESTAMPTZ,
  paid_by UUID,
  bounced_at TIMESTAMPTZ,
  bounce_reason TEXT,
  notified_landlord_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hap_disbursements_batch ON public.hap_disbursements(batch_id);
CREATE INDEX idx_hap_disbursements_agency ON public.hap_disbursements(agency_id);
CREATE INDEX idx_hap_disbursements_landlord ON public.hap_disbursements(landlord_id);
CREATE INDEX idx_hap_disbursements_status ON public.hap_disbursements(status);

ALTER TABLE public.hap_disbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff view own disbursements"
  ON public.hap_disbursements FOR SELECT
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff insert own disbursements"
  ON public.hap_disbursements FOR INSERT
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff update own disbursements"
  ON public.hap_disbursements FOR UPDATE
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE TRIGGER trg_hap_disbursements_updated_at
  BEFORE UPDATE ON public.hap_disbursements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Settings
CREATE TABLE public.agency_payment_settings (
  agency_id UUID PRIMARY KEY,
  primary_rail TEXT NOT NULL DEFAULT 'nacha' CHECK (primary_rail IN ('nacha','manual','ap_export')),
  ap_export_format TEXT CHECK (ap_export_format IN ('yardi_csv','qb_iif','generic_csv')),
  manual_default_memo TEXT,
  notify_landlord_on_disburse BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff view own payment settings"
  ON public.agency_payment_settings FOR SELECT
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff upsert own payment settings"
  ON public.agency_payment_settings FOR INSERT
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff update own payment settings"
  ON public.agency_payment_settings FOR UPDATE
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE TRIGGER trg_agency_payment_settings_updated_at
  BEFORE UPDATE ON public.agency_payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
