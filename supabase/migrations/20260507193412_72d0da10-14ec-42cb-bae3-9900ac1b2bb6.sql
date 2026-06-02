CREATE TABLE IF NOT EXISTS public.agency_vms_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  period_month DATE NOT NULL,
  units_leased INT NOT NULL DEFAULT 0,
  units_under_lease INT NOT NULL DEFAULT 0,
  hap_expense NUMERIC(12,2) NOT NULL DEFAULT 0,
  admin_fee_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  ud_units INT NOT NULL DEFAULT 0,
  port_in_units INT NOT NULL DEFAULT 0,
  port_out_units INT NOT NULL DEFAULT 0,
  fss_escrow_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  vms_file_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  submitted_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, period_month)
);

ALTER TABLE public.agency_vms_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view VMS submissions"
ON public.agency_vms_submissions FOR SELECT
USING (
  public.is_agency_staff(auth.uid(), agency_id)
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Agency admins can insert VMS submissions"
ON public.agency_vms_submissions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.user_id = auth.uid()
      AND s.agency_id = agency_vms_submissions.agency_id
      AND s.is_active = true
      AND s.role IN ('agency_admin'::agency_role,'executive_director'::agency_role,'finance'::agency_role)
  )
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Agency admins can update VMS submissions"
ON public.agency_vms_submissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.user_id = auth.uid()
      AND s.agency_id = agency_vms_submissions.agency_id
      AND s.is_active = true
      AND s.role IN ('agency_admin'::agency_role,'executive_director'::agency_role,'finance'::agency_role)
  )
  OR public.is_admin(auth.uid())
);

CREATE TRIGGER update_agency_vms_submissions_updated_at
BEFORE UPDATE ON public.agency_vms_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_vms_submissions_agency_period
  ON public.agency_vms_submissions(agency_id, period_month DESC);

ALTER TABLE public.agency_special_claims
  ADD COLUMN IF NOT EXISTS included_in_batch_id UUID,
  ADD COLUMN IF NOT EXISTS included_at TIMESTAMPTZ;

ALTER TABLE public.hap_batch_items
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'monthly_hap',
  ADD COLUMN IF NOT EXISTS source_claim_id UUID;

CREATE INDEX IF NOT EXISTS idx_hap_batch_items_type
  ON public.hap_batch_items(batch_id, item_type);

CREATE INDEX IF NOT EXISTS idx_special_claims_unbatched
  ON public.agency_special_claims(agency_id, status)
  WHERE included_in_batch_id IS NULL;