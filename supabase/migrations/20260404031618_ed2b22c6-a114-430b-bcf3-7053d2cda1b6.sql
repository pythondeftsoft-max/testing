
-- ============================================================
-- Phase 1A: Agency Portal & RFTA System — Database Foundation
-- ============================================================

-- 1. New enums
CREATE TYPE public.agency_role AS ENUM ('agency_admin', 'caseworker', 'inspector', 'viewer');
CREATE TYPE public.rfta_status AS ENUM ('draft', 'tenant_submitted', 'landlord_submitted', 'submitted', 'under_review', 'approved', 'denied', 'expired', 'withdrawn');
CREATE TYPE public.inspection_status AS ENUM ('scheduled', 'in_progress', 'completed', 'rescheduled', 'cancelled');
CREATE TYPE public.inspection_result AS ENUM ('pass', 'fail', 'conditional', 'pending');
CREATE TYPE public.voucher_status AS ENUM ('pending', 'active', 'expired', 'ported_out', 'ported_in', 'revoked');

-- 2. Add 'agency' to user_type enum
ALTER TYPE public.user_type ADD VALUE IF NOT EXISTS 'agency';

-- 3. housing_authorities table
CREATE TABLE public.housing_authorities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'US',
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  tenant_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_housing_authorities_slug ON public.housing_authorities(slug);
CREATE INDEX idx_housing_authorities_state ON public.housing_authorities(state);

-- 4. agency_staff table
CREATE TABLE public.agency_staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  role public.agency_role NOT NULL DEFAULT 'viewer',
  invited_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, agency_id)
);
CREATE INDEX idx_agency_staff_user ON public.agency_staff(user_id);
CREATE INDEX idx_agency_staff_agency ON public.agency_staff(agency_id);

-- 5. caseworker_assignments table
CREATE TABLE public.caseworker_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caseworker_id UUID NOT NULL REFERENCES public.agency_staff(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(caseworker_id, tenant_id)
);
CREATE INDEX idx_caseworker_assignments_caseworker ON public.caseworker_assignments(caseworker_id);
CREATE INDEX idx_caseworker_assignments_tenant ON public.caseworker_assignments(tenant_id);

-- 6. rfta_packets table
CREATE TABLE public.rfta_packets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  landlord_id UUID REFERENCES auth.users(id),
  property_id UUID REFERENCES public.properties(id),
  unit_id UUID REFERENCES public.property_units(id),
  agency_id UUID REFERENCES public.housing_authorities(id),
  application_id UUID,
  status public.rfta_status NOT NULL DEFAULT 'draft',
  packet_data JSONB DEFAULT '{}'::jsonb,
  tenant_data JSONB DEFAULT '{}'::jsonb,
  landlord_data JSONB DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  decision_notes TEXT,
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rfta_packets_tenant ON public.rfta_packets(tenant_id);
CREATE INDEX idx_rfta_packets_landlord ON public.rfta_packets(landlord_id);
CREATE INDEX idx_rfta_packets_agency ON public.rfta_packets(agency_id);
CREATE INDEX idx_rfta_packets_status ON public.rfta_packets(status);
CREATE INDEX idx_rfta_packets_share_token ON public.rfta_packets(share_token);

-- 7. rfta_documents table
CREATE TABLE public.rfta_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfta_packet_id UUID NOT NULL REFERENCES public.rfta_packets(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rfta_documents_packet ON public.rfta_documents(rfta_packet_id);

-- 8. agency_vouchers table
CREATE TABLE public.agency_vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voucher_number TEXT,
  voucher_type TEXT NOT NULL DEFAULT 'hcv',
  amount NUMERIC(10,2),
  status public.voucher_status NOT NULL DEFAULT 'pending',
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  ported_from_agency_id UUID REFERENCES public.housing_authorities(id),
  ported_to_agency_id UUID REFERENCES public.housing_authorities(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agency_vouchers_agency ON public.agency_vouchers(agency_id);
CREATE INDEX idx_agency_vouchers_tenant ON public.agency_vouchers(tenant_id);
CREATE INDEX idx_agency_vouchers_status ON public.agency_vouchers(status);

-- 9. inspections table
CREATE TABLE public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfta_packet_id UUID REFERENCES public.rfta_packets(id),
  property_id UUID REFERENCES public.properties(id),
  unit_id UUID REFERENCES public.property_units(id),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  inspector_id UUID REFERENCES public.agency_staff(id),
  scheduled_date TIMESTAMPTZ,
  completed_date TIMESTAMPTZ,
  status public.inspection_status NOT NULL DEFAULT 'scheduled',
  result public.inspection_result NOT NULL DEFAULT 'pending',
  checklist_data JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  rescheduled_from UUID REFERENCES public.inspections(id),
  reschedule_reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inspections_agency ON public.inspections(agency_id);
CREATE INDEX idx_inspections_inspector ON public.inspections(inspector_id);
CREATE INDEX idx_inspections_status ON public.inspections(status);
CREATE INDEX idx_inspections_scheduled ON public.inspections(scheduled_date);

-- 10. inspection_photos table
CREATE TABLE public.inspection_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inspection_photos_inspection ON public.inspection_photos(inspection_id);

-- 11. Add agency_id to tenant_profiles
ALTER TABLE public.tenant_profiles
  ADD COLUMN IF NOT EXISTS agency_id UUID REFERENCES public.housing_authorities(id);
CREATE INDEX IF NOT EXISTS idx_tenant_profiles_agency ON public.tenant_profiles(agency_id);

-- 12. Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_housing_authorities_updated_at BEFORE UPDATE ON public.housing_authorities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agency_staff_updated_at BEFORE UPDATE ON public.agency_staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_caseworker_assignments_updated_at BEFORE UPDATE ON public.caseworker_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rfta_packets_updated_at BEFORE UPDATE ON public.rfta_packets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agency_vouchers_updated_at BEFORE UPDATE ON public.agency_vouchers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_inspections_updated_at BEFORE UPDATE ON public.inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 13. Security definer helpers for RLS
-- ============================================================

-- Check if user is staff of a given agency
CREATE OR REPLACE FUNCTION public.is_agency_staff(_user_id UUID, _agency_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE user_id = _user_id AND agency_id = _agency_id AND is_active = true
  );
$$;

-- Get the agency_id for a staff user
CREATE OR REPLACE FUNCTION public.get_user_agency_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT agency_id FROM public.agency_staff
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1;
$$;

-- Check if user is a caseworker assigned to a specific tenant
CREATE OR REPLACE FUNCTION public.is_assigned_caseworker(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.caseworker_assignments ca
    JOIN public.agency_staff ast ON ast.id = ca.caseworker_id
    WHERE ast.user_id = _user_id AND ca.tenant_id = _tenant_id AND ca.is_active = true AND ast.is_active = true
  );
$$;

-- Check if user has a specific agency role
CREATE OR REPLACE FUNCTION public.has_agency_role(_user_id UUID, _role public.agency_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE user_id = _user_id AND role = _role AND is_active = true
  );
$$;

-- ============================================================
-- 14. RLS Policies
-- ============================================================

-- housing_authorities
ALTER TABLE public.housing_authorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active housing authorities"
  ON public.housing_authorities FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage housing authorities"
  ON public.housing_authorities FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- agency_staff
ALTER TABLE public.agency_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view their own agency members"
  ON public.agency_staff FOR SELECT TO authenticated
  USING (
    public.is_agency_staff(auth.uid(), agency_id)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can manage agency staff"
  ON public.agency_staff FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- caseworker_assignments
ALTER TABLE public.caseworker_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Caseworkers see own assignments, agency admins see agency assignments"
  ON public.caseworker_assignments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff ast
      WHERE ast.id = caseworker_id AND ast.user_id = auth.uid() AND ast.is_active = true
    )
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can manage caseworker assignments"
  ON public.caseworker_assignments FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- rfta_packets
ALTER TABLE public.rfta_packets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rfta packets"
  ON public.rfta_packets FOR SELECT TO authenticated
  USING (
    tenant_id = auth.uid()
    OR landlord_id = auth.uid()
    OR public.is_agency_staff(auth.uid(), agency_id)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Tenants can create rfta packets"
  ON public.rfta_packets FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Authorized users can update rfta packets"
  ON public.rfta_packets FOR UPDATE TO authenticated
  USING (
    tenant_id = auth.uid()
    OR landlord_id = auth.uid()
    OR public.is_agency_staff(auth.uid(), agency_id)
    OR public.is_admin(auth.uid())
  );

-- rfta_documents
ALTER TABLE public.rfta_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rfta documents for their packets"
  ON public.rfta_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rfta_packets rp
      WHERE rp.id = rfta_packet_id
      AND (rp.tenant_id = auth.uid() OR rp.landlord_id = auth.uid()
           OR public.is_agency_staff(auth.uid(), rp.agency_id)
           OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can upload rfta documents"
  ON public.rfta_documents FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() OR public.is_admin(auth.uid()));

-- agency_vouchers
ALTER TABLE public.agency_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View vouchers"
  ON public.agency_vouchers FOR SELECT TO authenticated
  USING (
    tenant_id = auth.uid()
    OR public.is_agency_staff(auth.uid(), agency_id)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Agency staff and admins can manage vouchers"
  ON public.agency_vouchers FOR ALL TO authenticated
  USING (
    public.is_agency_staff(auth.uid(), agency_id)
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    public.is_agency_staff(auth.uid(), agency_id)
    OR public.is_admin(auth.uid())
  );

-- inspections
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View inspections"
  ON public.inspections FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.agency_staff WHERE id = inspector_id AND user_id = auth.uid() AND is_active = true)
    OR public.is_agency_staff(auth.uid(), agency_id)
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Agency staff and admins can manage inspections"
  ON public.inspections FOR ALL TO authenticated
  USING (
    public.is_agency_staff(auth.uid(), agency_id)
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    public.is_agency_staff(auth.uid(), agency_id)
    OR public.is_admin(auth.uid())
  );

-- inspection_photos
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View inspection photos"
  ON public.inspection_photos FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id
      AND (
        EXISTS (SELECT 1 FROM public.agency_staff WHERE id = i.inspector_id AND user_id = auth.uid() AND is_active = true)
        OR public.is_agency_staff(auth.uid(), i.agency_id)
        OR public.is_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Upload inspection photos"
  ON public.inspection_photos FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() OR public.is_admin(auth.uid()));
