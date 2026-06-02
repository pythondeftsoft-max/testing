
-- Enums
CREATE TYPE public.recertification_type AS ENUM ('annual', 'interim', 'biennial');
CREATE TYPE public.recertification_status AS ENUM ('upcoming', 'documents_requested', 'under_review', 'completed', 'overdue');
CREATE TYPE public.hqs_category AS ENUM ('site', 'building_exterior', 'building_systems', 'unit_interior', 'bathroom', 'kitchen', 'bedroom', 'other_rooms', 'doors_windows', 'ceiling_walls_floors', 'plumbing', 'electrical', 'fire_safety');
CREATE TYPE public.w9_status AS ENUM ('pending', 'submitted', 'approved');
CREATE TYPE public.landlord_payment_method AS ENUM ('check', 'ach', 'direct_deposit');
CREATE TYPE public.landlord_onboarding_status AS ENUM ('invited', 'active', 'inactive');
CREATE TYPE public.tenant_lease_status AS ENUM ('active', 'expired', 'terminated', 'pending');

ALTER TYPE public.agency_role ADD VALUE IF NOT EXISTS 'executive_director';
ALTER TYPE public.agency_role ADD VALUE IF NOT EXISTS 'finance';
ALTER TYPE public.agency_role ADD VALUE IF NOT EXISTS 'intake_clerk';
ALTER TYPE public.agency_role ADD VALUE IF NOT EXISTS 'porting_coordinator';

-- 1. agency_recertifications
CREATE TABLE public.agency_recertifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.agency_staff(id) ON DELETE SET NULL,
  type recertification_type NOT NULL DEFAULT 'annual',
  due_date DATE NOT NULL,
  status recertification_status NOT NULL DEFAULT 'upcoming',
  document_checklist JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agency_recertifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view recerts" ON public.agency_recertifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_staff WHERE agency_staff.agency_id = agency_recertifications.agency_id AND agency_staff.user_id = auth.uid() AND agency_staff.is_active = true));
CREATE POLICY "Admin/caseworker manage recerts" ON public.agency_recertifications FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_staff WHERE agency_staff.agency_id = agency_recertifications.agency_id AND agency_staff.user_id = auth.uid() AND agency_staff.is_active = true AND agency_staff.role IN ('agency_admin', 'caseworker')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_staff WHERE agency_staff.agency_id = agency_recertifications.agency_id AND agency_staff.user_id = auth.uid() AND agency_staff.is_active = true AND agency_staff.role IN ('agency_admin', 'caseworker')));
CREATE INDEX idx_recerts_agency ON public.agency_recertifications(agency_id);
CREATE INDEX idx_recerts_tenant ON public.agency_recertifications(tenant_id);
CREATE INDEX idx_recerts_due ON public.agency_recertifications(due_date);

-- 2. hqs_inspection_items
CREATE TABLE public.hqs_inspection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  category hqs_category NOT NULL,
  item_name TEXT NOT NULL,
  passed BOOLEAN,
  deficiency_notes TEXT,
  photo_required BOOLEAN NOT NULL DEFAULT false,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.hqs_inspection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view hqs items" ON public.hqs_inspection_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspections i JOIN public.agency_staff s ON s.agency_id = i.agency_id WHERE i.id = hqs_inspection_items.inspection_id AND s.user_id = auth.uid() AND s.is_active = true));
CREATE POLICY "Inspector/admin manage hqs items" ON public.hqs_inspection_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.inspections i JOIN public.agency_staff s ON s.agency_id = i.agency_id WHERE i.id = hqs_inspection_items.inspection_id AND s.user_id = auth.uid() AND s.is_active = true AND s.role IN ('agency_admin', 'inspector')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.inspections i JOIN public.agency_staff s ON s.agency_id = i.agency_id WHERE i.id = hqs_inspection_items.inspection_id AND s.user_id = auth.uid() AND s.is_active = true AND s.role IN ('agency_admin', 'inspector')));
CREATE INDEX idx_hqs_inspection ON public.hqs_inspection_items(inspection_id);

-- 3. agency_landlords
CREATE TABLE public.agency_landlords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  landlord_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  landlord_email TEXT NOT NULL,
  landlord_name TEXT NOT NULL,
  w9_status w9_status NOT NULL DEFAULT 'pending',
  payment_method landlord_payment_method NOT NULL DEFAULT 'check',
  onboarding_status landlord_onboarding_status NOT NULL DEFAULT 'invited',
  properties_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agency_landlords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff view landlords" ON public.agency_landlords FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_staff WHERE agency_staff.agency_id = agency_landlords.agency_id AND agency_staff.user_id = auth.uid() AND agency_staff.is_active = true));
CREATE POLICY "Admin/caseworker manage landlords" ON public.agency_landlords FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_staff WHERE agency_staff.agency_id = agency_landlords.agency_id AND agency_staff.user_id = auth.uid() AND agency_staff.is_active = true AND agency_staff.role IN ('agency_admin', 'caseworker')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_staff WHERE agency_staff.agency_id = agency_landlords.agency_id AND agency_staff.user_id = auth.uid() AND agency_staff.is_active = true AND agency_staff.role IN ('agency_admin', 'caseworker')));
CREATE INDEX idx_al_agency ON public.agency_landlords(agency_id);
CREATE UNIQUE INDEX idx_al_unique ON public.agency_landlords(agency_id, landlord_email);

-- 4. tenant_leases (TEXT for lease_category to avoid enum conflict)
CREATE TABLE public.tenant_leases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.property_units(id) ON DELETE SET NULL,
  agency_id UUID REFERENCES public.housing_authorities(id) ON DELETE SET NULL,
  lease_category TEXT NOT NULL DEFAULT 'market_rate',
  monthly_rent NUMERIC(10,2),
  tenant_portion NUMERIC(10,2),
  hap_portion NUMERIC(10,2),
  lease_start DATE NOT NULL,
  lease_end DATE,
  status tenant_lease_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants view own leases" ON public.tenant_leases FOR SELECT TO authenticated USING (tenant_id = auth.uid());
CREATE POLICY "Landlords view their leases" ON public.tenant_leases FOR SELECT TO authenticated USING (landlord_id = auth.uid());
CREATE POLICY "Agency staff view voucher leases" ON public.tenant_leases FOR SELECT TO authenticated
  USING (agency_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.agency_staff WHERE agency_staff.agency_id = tenant_leases.agency_id AND agency_staff.user_id = auth.uid() AND agency_staff.is_active = true));
CREATE POLICY "Landlords manage leases" ON public.tenant_leases FOR ALL TO authenticated USING (landlord_id = auth.uid()) WITH CHECK (landlord_id = auth.uid());
CREATE POLICY "Agency admin manage voucher leases" ON public.tenant_leases FOR ALL TO authenticated
  USING (agency_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.agency_staff WHERE agency_staff.agency_id = tenant_leases.agency_id AND agency_staff.user_id = auth.uid() AND agency_staff.is_active = true AND agency_staff.role = 'agency_admin'))
  WITH CHECK (agency_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.agency_staff WHERE agency_staff.agency_id = tenant_leases.agency_id AND agency_staff.user_id = auth.uid() AND agency_staff.is_active = true AND agency_staff.role = 'agency_admin'));
CREATE INDEX idx_tl_tenant ON public.tenant_leases(tenant_id);
CREATE INDEX idx_tl_landlord ON public.tenant_leases(landlord_id);
CREATE INDEX idx_tl_agency ON public.tenant_leases(agency_id);

-- 5. agency_role_permissions
CREATE TABLE public.agency_role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT NOT NULL,
  tab_name TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(role_name, tab_name)
);
ALTER TABLE public.agency_role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read perms" ON public.agency_role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage perms" ON public.agency_role_permissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.agency_staff WHERE agency_staff.user_id = auth.uid() AND agency_staff.is_active = true AND agency_staff.role = 'agency_admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.agency_staff WHERE agency_staff.user_id = auth.uid() AND agency_staff.is_active = true AND agency_staff.role = 'agency_admin'));

INSERT INTO public.agency_role_permissions (role_name, tab_name, can_view, can_edit, can_create, can_delete) VALUES
  ('agency_admin','overview',true,true,true,true),('agency_admin','waitlist',true,true,true,true),('agency_admin','caseload',true,true,true,true),('agency_admin','properties',true,true,true,true),('agency_admin','rfta',true,true,true,true),('agency_admin','inspections',true,true,true,true),('agency_admin','placements',true,true,true,true),('agency_admin','operations',true,true,true,true),('agency_admin','recertifications',true,true,true,true),
  ('caseworker','overview',true,false,false,false),('caseworker','waitlist',true,true,true,false),('caseworker','caseload',true,true,true,false),('caseworker','properties',true,false,false,false),('caseworker','rfta',true,true,true,false),('caseworker','inspections',true,false,false,false),('caseworker','placements',true,true,true,false),('caseworker','operations',false,false,false,false),('caseworker','recertifications',true,true,true,false),
  ('inspector','overview',true,false,false,false),('inspector','waitlist',false,false,false,false),('inspector','caseload',false,false,false,false),('inspector','properties',true,false,false,false),('inspector','rfta',false,false,false,false),('inspector','inspections',true,true,true,false),('inspector','placements',false,false,false,false),('inspector','operations',false,false,false,false),('inspector','recertifications',false,false,false,false),
  ('viewer','overview',true,false,false,false),('viewer','waitlist',true,false,false,false),('viewer','caseload',true,false,false,false),('viewer','properties',true,false,false,false),('viewer','rfta',true,false,false,false),('viewer','inspections',true,false,false,false),('viewer','placements',true,false,false,false),('viewer','operations',false,false,false,false),('viewer','recertifications',true,false,false,false),
  ('executive_director','overview',true,false,false,false),('executive_director','waitlist',true,false,false,false),('executive_director','caseload',true,false,false,false),('executive_director','properties',true,false,false,false),('executive_director','rfta',true,true,false,false),('executive_director','inspections',true,false,false,false),('executive_director','placements',true,true,false,false),('executive_director','operations',true,false,false,false),('executive_director','recertifications',true,false,false,false),
  ('finance','overview',true,false,false,false),('finance','waitlist',false,false,false,false),('finance','caseload',false,false,false,false),('finance','properties',false,false,false,false),('finance','rfta',false,false,false,false),('finance','inspections',false,false,false,false),('finance','placements',true,true,false,false),('finance','operations',false,false,false,false),('finance','recertifications',false,false,false,false),
  ('intake_clerk','overview',true,false,false,false),('intake_clerk','waitlist',true,true,true,false),('intake_clerk','caseload',true,false,false,false),('intake_clerk','properties',false,false,false,false),('intake_clerk','rfta',false,false,false,false),('intake_clerk','inspections',false,false,false,false),('intake_clerk','placements',false,false,false,false),('intake_clerk','operations',false,false,false,false),('intake_clerk','recertifications',false,false,false,false),
  ('porting_coordinator','overview',true,false,false,false),('porting_coordinator','waitlist',false,false,false,false),('porting_coordinator','caseload',true,false,false,false),('porting_coordinator','properties',false,false,false,false),('porting_coordinator','rfta',true,true,true,false),('porting_coordinator','inspections',false,false,false,false),('porting_coordinator','placements',true,true,true,false),('porting_coordinator','operations',true,true,true,false),('porting_coordinator','recertifications',false,false,false,false);

-- Triggers
CREATE TRIGGER update_recerts_ts BEFORE UPDATE ON public.agency_recertifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_al_ts BEFORE UPDATE ON public.agency_landlords FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tl_ts BEFORE UPDATE ON public.tenant_leases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_arp_ts BEFORE UPDATE ON public.agency_role_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
