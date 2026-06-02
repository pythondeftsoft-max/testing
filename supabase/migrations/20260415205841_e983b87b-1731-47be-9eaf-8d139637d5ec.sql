
CREATE TABLE public.lead_prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'manual',
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  raw_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new',
  matched_user_id UUID REFERENCES public.profiles(id),
  notes TEXT,
  contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view lead prospects"
ON public.lead_prospects FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert lead prospects"
ON public.lead_prospects FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update lead prospects"
ON public.lead_prospects FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete lead prospects"
ON public.lead_prospects FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE INDEX idx_lead_prospects_status ON public.lead_prospects(status);
CREATE INDEX idx_lead_prospects_source ON public.lead_prospects(source);
CREATE INDEX idx_lead_prospects_matched_user ON public.lead_prospects(matched_user_id);
