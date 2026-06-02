
-- 1. Agency Documents table
CREATE TABLE public.agency_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_documents_entity ON public.agency_documents(entity_type, entity_id);
CREATE INDEX idx_agency_documents_agency ON public.agency_documents(agency_id);

ALTER TABLE public.agency_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view their agency documents"
  ON public.agency_documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_documents.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
  ));

CREATE POLICY "Agency staff can upload documents"
  ON public.agency_documents FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = agency_documents.agency_id
        AND agency_staff.user_id = auth.uid()
        AND agency_staff.is_active = true
    )
  );

CREATE POLICY "Agency staff can delete their agency documents"
  ON public.agency_documents FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_documents.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
      AND agency_staff.role = 'agency_admin'
  ));

-- 2. Activity Log table
CREATE TABLE public.agency_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_activity_entity ON public.agency_activity_log(entity_type, entity_id);
CREATE INDEX idx_agency_activity_agency ON public.agency_activity_log(agency_id);
CREATE INDEX idx_agency_activity_created ON public.agency_activity_log(created_at DESC);

ALTER TABLE public.agency_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view their agency activity"
  ON public.agency_activity_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_activity_log.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
  ));

CREATE POLICY "Agency staff can create activity entries"
  ON public.agency_activity_log FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = agency_activity_log.agency_id
        AND agency_staff.user_id = auth.uid()
        AND agency_staff.is_active = true
    )
  );

-- 3. Voucher Applications table (public intake)
CREATE TABLE public.voucher_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  date_of_birth DATE,
  household_size INT DEFAULT 1,
  annual_income NUMERIC(12,2),
  current_address TEXT,
  housing_type_requested TEXT,
  special_needs TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_voucher_applications_agency ON public.voucher_applications(agency_id);
CREATE INDEX idx_voucher_applications_status ON public.voucher_applications(status);

ALTER TABLE public.voucher_applications ENABLE ROW LEVEL SECURITY;

-- Public can submit applications (anon)
CREATE POLICY "Anyone can submit a voucher application"
  ON public.voucher_applications FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Agency staff can view their agency applications
CREATE POLICY "Agency staff can view applications"
  ON public.voucher_applications FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = voucher_applications.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
  ));

-- Agency staff can update applications
CREATE POLICY "Agency staff can update applications"
  ON public.voucher_applications FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = voucher_applications.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
  ));

-- 4. Porting Requests table
CREATE TABLE public.porting_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id UUID REFERENCES public.agency_vouchers(id),
  from_agency_id UUID NOT NULL REFERENCES public.housing_authorities(id),
  to_agency_id UUID NOT NULL REFERENCES public.housing_authorities(id),
  tenant_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'requested',
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_porting_from ON public.porting_requests(from_agency_id);
CREATE INDEX idx_porting_to ON public.porting_requests(to_agency_id);
CREATE INDEX idx_porting_status ON public.porting_requests(status);

ALTER TABLE public.porting_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency staff can view porting requests involving their agency"
  ON public.porting_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.user_id = auth.uid()
        AND agency_staff.is_active = true
        AND (agency_staff.agency_id = porting_requests.from_agency_id
          OR agency_staff.agency_id = porting_requests.to_agency_id)
    )
  );

CREATE POLICY "Agency staff can create porting requests from their agency"
  ON public.porting_requests FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = porting_requests.from_agency_id
        AND agency_staff.user_id = auth.uid()
        AND agency_staff.is_active = true
    )
  );

CREATE POLICY "Agency staff can update porting requests involving their agency"
  ON public.porting_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.user_id = auth.uid()
        AND agency_staff.is_active = true
        AND (agency_staff.agency_id = porting_requests.from_agency_id
          OR agency_staff.agency_id = porting_requests.to_agency_id)
    )
  );

-- 5. Add prefilled_from column to rfta_packets
ALTER TABLE public.rfta_packets ADD COLUMN IF NOT EXISTS prefilled_from JSONB DEFAULT '{}';

-- 6. Create agency-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-documents', 'agency-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Agency staff can upload to agency-documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'agency-documents');

CREATE POLICY "Agency staff can view agency-documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'agency-documents');

-- 7. Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_voucher_applications_updated_at
  BEFORE UPDATE ON public.voucher_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_porting_requests_updated_at
  BEFORE UPDATE ON public.porting_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
