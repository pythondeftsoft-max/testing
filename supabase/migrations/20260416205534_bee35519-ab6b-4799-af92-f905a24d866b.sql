-- Sales pipeline lead status enum
CREATE TYPE public.agency_lead_status AS ENUM (
  'new',
  'contacted',
  'demo_scheduled',
  'proposal_sent',
  'won',
  'lost'
);

-- Agency leads table
CREATE TABLE public.agency_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  contact_role TEXT,
  agency_name TEXT NOT NULL,
  agency_state TEXT,
  voucher_count INTEGER,
  current_software TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'for-agencies-page',
  status public.agency_lead_status NOT NULL DEFAULT 'new',
  internal_notes TEXT,
  assigned_to UUID,
  converted_agency_id UUID REFERENCES public.housing_authorities(id) ON DELETE SET NULL,
  converted_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_leads_status ON public.agency_leads(status);
CREATE INDEX idx_agency_leads_created_at ON public.agency_leads(created_at DESC);

ALTER TABLE public.agency_leads ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a lead (public form)
CREATE POLICY "Anyone can submit a lead"
ON public.agency_leads
FOR INSERT
WITH CHECK (true);

-- Only platform admins can view leads
CREATE POLICY "Admins can view all leads"
ON public.agency_leads
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Only platform admins can update leads
CREATE POLICY "Admins can update leads"
ON public.agency_leads
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Only platform admins can delete leads
CREATE POLICY "Admins can delete leads"
ON public.agency_leads
FOR DELETE
USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_agency_leads_updated_at
BEFORE UPDATE ON public.agency_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Agency lead activity log (notes, status changes, emails sent)
CREATE TABLE public.agency_lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.agency_leads(id) ON DELETE CASCADE,
  actor_id UUID,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_lead_activities_lead_id ON public.agency_lead_activities(lead_id, created_at DESC);

ALTER TABLE public.agency_lead_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activities"
ON public.agency_lead_activities
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert activities"
ON public.agency_lead_activities
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Agency onboarding progress
CREATE TABLE public.agency_onboarding_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL UNIQUE REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1,
  completed_steps INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  step_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  started_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_onboarding_agency_id ON public.agency_onboarding_progress(agency_id);

ALTER TABLE public.agency_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Agency staff (admins) can view their own onboarding progress
CREATE POLICY "Agency staff can view their onboarding"
ON public.agency_onboarding_progress
FOR SELECT
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_onboarding_progress.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
      AND agency_staff.role = 'agency_admin'
  )
);

CREATE POLICY "Agency admins can update their onboarding"
ON public.agency_onboarding_progress
FOR UPDATE
USING (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_onboarding_progress.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
      AND agency_staff.role = 'agency_admin'
  )
);

CREATE POLICY "Admins can insert onboarding rows"
ON public.agency_onboarding_progress
FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.agency_staff
    WHERE agency_staff.agency_id = agency_onboarding_progress.agency_id
      AND agency_staff.user_id = auth.uid()
      AND agency_staff.is_active = true
      AND agency_staff.role = 'agency_admin'
  )
);

CREATE TRIGGER update_agency_onboarding_progress_updated_at
BEFORE UPDATE ON public.agency_onboarding_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();