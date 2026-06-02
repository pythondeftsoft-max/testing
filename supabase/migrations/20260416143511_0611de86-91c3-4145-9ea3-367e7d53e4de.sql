
-- Create agency_accommodations table for Fair Housing compliance
CREATE TABLE public.agency_accommodations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  accommodation_type TEXT NOT NULL DEFAULT 'reasonable_accommodation',
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested',
  requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  decision_date DATE,
  decision_by UUID REFERENCES public.profiles(id),
  decision_notes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agency_accommodations ENABLE ROW LEVEL SECURITY;

-- RLS: agency staff can manage accommodations for their agency
CREATE POLICY "Agency staff can view accommodations"
  ON public.agency_accommodations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = agency_accommodations.agency_id
        AND agency_staff.user_id = auth.uid()
        AND agency_staff.is_active = true
    )
  );

CREATE POLICY "Agency staff can create accommodations"
  ON public.agency_accommodations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = agency_accommodations.agency_id
        AND agency_staff.user_id = auth.uid()
        AND agency_staff.is_active = true
    )
  );

CREATE POLICY "Agency staff can update accommodations"
  ON public.agency_accommodations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = agency_accommodations.agency_id
        AND agency_staff.user_id = auth.uid()
        AND agency_staff.is_active = true
    )
  );

CREATE POLICY "Agency staff can delete accommodations"
  ON public.agency_accommodations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff
      WHERE agency_staff.agency_id = agency_accommodations.agency_id
        AND agency_staff.user_id = auth.uid()
        AND agency_staff.is_active = true
    )
  );

-- Index for common queries
CREATE INDEX idx_accommodations_agency ON public.agency_accommodations(agency_id);
CREATE INDEX idx_accommodations_tenant ON public.agency_accommodations(tenant_id);
CREATE INDEX idx_accommodations_status ON public.agency_accommodations(status);

-- Timestamp trigger
CREATE TRIGGER update_accommodations_updated_at
  BEFORE UPDATE ON public.agency_accommodations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
