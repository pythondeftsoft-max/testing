DO $$ BEGIN
  CREATE TYPE public.w9_tax_classification AS ENUM (
    'individual', 'sole_proprietor', 'single_member_llc', 'partnership',
    'c_corporation', 's_corporation', 'trust_estate', 'llc_c', 'llc_s', 'llc_p', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.w9_tin_type AS ENUM ('ssn', 'ein');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.w9_submission_status AS ENUM ('draft', 'submitted', 'verified', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.landlord_w9_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL,
  agency_id UUID REFERENCES public.housing_authorities(id) ON DELETE SET NULL,
  tax_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())::INT,
  legal_name TEXT NOT NULL,
  business_name TEXT,
  tax_classification public.w9_tax_classification NOT NULL DEFAULT 'individual',
  llc_tax_class TEXT,
  exempt_payee_code TEXT,
  fatca_exemption_code TEXT,
  tin_type public.w9_tin_type NOT NULL DEFAULT 'ssn',
  tin_last_four TEXT,
  tin_verified BOOLEAN NOT NULL DEFAULT false,
  tin_verified_at TIMESTAMPTZ,
  tin_verified_by UUID,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  address_city TEXT NOT NULL,
  address_state TEXT NOT NULL,
  address_zip TEXT NOT NULL,
  signature_data TEXT,
  signature_typed_name TEXT,
  signed_at TIMESTAMPTZ,
  status public.w9_submission_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_w9_landlord ON public.landlord_w9_submissions(landlord_id);
CREATE INDEX IF NOT EXISTS idx_w9_agency ON public.landlord_w9_submissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_w9_status ON public.landlord_w9_submissions(status);
CREATE INDEX IF NOT EXISTS idx_w9_year ON public.landlord_w9_submissions(tax_year);

ALTER TABLE public.landlord_w9_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords view own W-9"
ON public.landlord_w9_submissions FOR SELECT
TO authenticated
USING (landlord_id = auth.uid());

CREATE POLICY "Landlords insert own W-9"
ON public.landlord_w9_submissions FOR INSERT
TO authenticated
WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Landlords update own draft/submitted W-9"
ON public.landlord_w9_submissions FOR UPDATE
TO authenticated
USING (landlord_id = auth.uid() AND status IN ('draft','submitted'))
WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Agency staff view their agency W-9s"
ON public.landlord_w9_submissions FOR SELECT
TO authenticated
USING (agency_id IS NOT NULL AND public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff update their agency W-9s"
ON public.landlord_w9_submissions FOR UPDATE
TO authenticated
USING (agency_id IS NOT NULL AND public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Admins manage all W-9s"
ON public.landlord_w9_submissions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_landlord_w9_submissions_updated_at
BEFORE UPDATE ON public.landlord_w9_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('tax-documents', 'tax-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Landlords read own tax docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tax-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Agency staff read tax docs for their landlords"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tax-documents'
  AND EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.user_id = auth.uid() AND s.is_active = true
  )
);

CREATE POLICY "Agency staff and admins write tax docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tax-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.agency_staff s WHERE s.user_id = auth.uid() AND s.is_active = true)
  )
);

CREATE POLICY "Agency staff and admins update tax docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tax-documents'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.agency_staff s WHERE s.user_id = auth.uid() AND s.is_active = true)
  )
);