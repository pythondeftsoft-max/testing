
-- Landlord W-9 documents tracking
CREATE TABLE public.landlord_w9_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL,
  agency_id UUID REFERENCES public.housing_authorities(id) ON DELETE SET NULL,
  tax_year INTEGER NOT NULL,
  legal_name TEXT NOT NULL,
  business_name TEXT,
  tax_classification TEXT NOT NULL DEFAULT 'individual',
  tin_type TEXT NOT NULL DEFAULT 'ssn',
  tin_last_four TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  signature_name TEXT,
  signature_date DATE,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'submitted',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_landlord_w9_landlord ON public.landlord_w9_documents(landlord_id);
CREATE INDEX idx_landlord_w9_agency ON public.landlord_w9_documents(agency_id);
CREATE INDEX idx_landlord_w9_year ON public.landlord_w9_documents(tax_year);

ALTER TABLE public.landlord_w9_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage own W-9s"
  ON public.landlord_w9_documents
  FOR ALL
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Agency staff view their landlord W-9s"
  ON public.landlord_w9_documents
  FOR SELECT
  USING (
    agency_id IS NOT NULL 
    AND public.is_agency_staff(auth.uid(), agency_id)
  );

CREATE POLICY "Agency staff update review status"
  ON public.landlord_w9_documents
  FOR UPDATE
  USING (
    agency_id IS NOT NULL 
    AND public.is_agency_staff(auth.uid(), agency_id)
  );

CREATE TRIGGER update_landlord_w9_updated_at
  BEFORE UPDATE ON public.landlord_w9_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Landlord vacancy listings (Section 8 friendly)
CREATE TABLE public.landlord_vacancy_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL,
  property_id UUID,
  unit_id UUID,
  agency_id UUID REFERENCES public.housing_authorities(id) ON DELETE SET NULL,
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms NUMERIC(3,1) NOT NULL DEFAULT 1,
  square_feet INTEGER,
  monthly_rent NUMERIC(10,2) NOT NULL,
  utilities_included TEXT[],
  available_date DATE NOT NULL,
  description TEXT,
  amenities TEXT[],
  accepts_section8 BOOLEAN NOT NULL DEFAULT true,
  accepts_vash BOOLEAN NOT NULL DEFAULT false,
  accepts_emergency_vouchers BOOLEAN NOT NULL DEFAULT false,
  pet_friendly BOOLEAN NOT NULL DEFAULT false,
  wheelchair_accessible BOOLEAN NOT NULL DEFAULT false,
  contact_email TEXT,
  contact_phone TEXT,
  photos TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  inquiries_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vacancy_landlord ON public.landlord_vacancy_listings(landlord_id);
CREATE INDEX idx_vacancy_agency ON public.landlord_vacancy_listings(agency_id);
CREATE INDEX idx_vacancy_status ON public.landlord_vacancy_listings(status);
CREATE INDEX idx_vacancy_available ON public.landlord_vacancy_listings(available_date);

ALTER TABLE public.landlord_vacancy_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords manage own vacancies"
  ON public.landlord_vacancy_listings
  FOR ALL
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Agency staff view linked vacancies"
  ON public.landlord_vacancy_listings
  FOR SELECT
  USING (
    agency_id IS NOT NULL 
    AND public.is_agency_staff(auth.uid(), agency_id)
  );

CREATE POLICY "Active vacancies are publicly viewable"
  ON public.landlord_vacancy_listings
  FOR SELECT
  USING (status = 'active');

CREATE TRIGGER update_landlord_vacancy_updated_at
  BEFORE UPDATE ON public.landlord_vacancy_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for W-9s (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('w9-documents', 'w9-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Landlords upload own W-9 files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'w9-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Landlords view own W-9 files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'w9-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Landlords delete own W-9 files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'w9-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage bucket for vacancy photos (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('vacancy-photos', 'vacancy-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Vacancy photos publicly viewable"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'vacancy-photos');

CREATE POLICY "Landlords upload vacancy photos"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'vacancy-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Landlords delete own vacancy photos"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'vacancy-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
