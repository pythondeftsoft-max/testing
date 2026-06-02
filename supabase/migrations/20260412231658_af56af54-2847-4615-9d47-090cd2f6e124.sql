
-- Agency CRM Contacts table
CREATE TABLE public.agency_crm_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  role_description TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Agency CRM Notes table
CREATE TABLE public.agency_crm_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  note TEXT NOT NULL,
  contact_type TEXT NOT NULL DEFAULT 'internal' CHECK (contact_type IN ('call', 'email', 'meeting', 'internal')),
  follow_up_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_agency_crm_contacts_agency ON public.agency_crm_contacts(agency_id);
CREATE INDEX idx_agency_crm_notes_agency ON public.agency_crm_notes(agency_id);
CREATE INDEX idx_agency_crm_notes_follow_up ON public.agency_crm_notes(follow_up_date) WHERE follow_up_date IS NOT NULL;

-- Enable RLS
ALTER TABLE public.agency_crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_crm_notes ENABLE ROW LEVEL SECURITY;

-- RLS: Admin-only access for contacts
CREATE POLICY "Admins can view CRM contacts"
  ON public.agency_crm_contacts FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create CRM contacts"
  ON public.agency_crm_contacts FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update CRM contacts"
  ON public.agency_crm_contacts FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete CRM contacts"
  ON public.agency_crm_contacts FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS: Admin-only access for notes
CREATE POLICY "Admins can view CRM notes"
  ON public.agency_crm_notes FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can create CRM notes"
  ON public.agency_crm_notes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update CRM notes"
  ON public.agency_crm_notes FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete CRM notes"
  ON public.agency_crm_notes FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Updated_at trigger for contacts
CREATE TRIGGER update_agency_crm_contacts_updated_at
  BEFORE UPDATE ON public.agency_crm_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
