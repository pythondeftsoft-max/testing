
-- Create agency_fss_participants table
CREATE TABLE public.agency_fss_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caseworker_id UUID REFERENCES public.agency_staff(id),
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  contract_end_date DATE,
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'active', 'completed', 'terminated', 'expired')),
  baseline_rent NUMERIC DEFAULT 0,
  baseline_earned_income NUMERIC DEFAULT 0,
  itsp_goals JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create agency_fss_escrow table
CREATE TABLE public.agency_fss_escrow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public.agency_fss_participants(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  earned_income NUMERIC DEFAULT 0,
  calculated_rent_increase NUMERIC DEFAULT 0,
  escrow_credit NUMERIC DEFAULT 0,
  running_balance NUMERIC DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'monthly_credit' CHECK (type IN ('monthly_credit', 'interim_disbursement', 'final_disbursement', 'forfeiture')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agency_fss_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_fss_escrow ENABLE ROW LEVEL SECURITY;

-- RLS policies for agency_fss_participants
CREATE POLICY "Agency staff can view FSS participants"
  ON public.agency_fss_participants FOR SELECT
  TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff can create FSS participants"
  ON public.agency_fss_participants FOR INSERT
  TO authenticated
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff can update FSS participants"
  ON public.agency_fss_participants FOR UPDATE
  TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff can delete FSS participants"
  ON public.agency_fss_participants FOR DELETE
  TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

-- RLS policies for agency_fss_escrow
CREATE POLICY "Agency staff can view FSS escrow"
  ON public.agency_fss_escrow FOR SELECT
  TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff can create FSS escrow"
  ON public.agency_fss_escrow FOR INSERT
  TO authenticated
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff can update FSS escrow"
  ON public.agency_fss_escrow FOR UPDATE
  TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff can delete FSS escrow"
  ON public.agency_fss_escrow FOR DELETE
  TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id));

-- Indexes
CREATE INDEX idx_fss_participants_agency ON public.agency_fss_participants(agency_id);
CREATE INDEX idx_fss_participants_tenant ON public.agency_fss_participants(tenant_id);
CREATE INDEX idx_fss_participants_status ON public.agency_fss_participants(status);
CREATE INDEX idx_fss_escrow_participant ON public.agency_fss_escrow(participant_id);
CREATE INDEX idx_fss_escrow_agency ON public.agency_fss_escrow(agency_id);

-- Updated_at trigger for participants
CREATE TRIGGER update_fss_participants_updated_at
  BEFORE UPDATE ON public.agency_fss_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
