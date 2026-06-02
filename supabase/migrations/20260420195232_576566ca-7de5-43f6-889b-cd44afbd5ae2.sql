
-- ============================================================
-- NSPIRE Deficiency Codes (reference catalog)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nspire_deficiency_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('unit','inside','outside')),
  name TEXT NOT NULL,
  description TEXT,
  default_severity TEXT NOT NULL DEFAULT 'moderate' CHECK (default_severity IN ('life_threatening','severe','moderate','low')),
  default_cure_days INTEGER NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nspire_deficiency_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read NSPIRE codes"
  ON public.nspire_deficiency_codes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage NSPIRE codes"
  ON public.nspire_deficiency_codes FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_nspire_codes_updated_at
  BEFORE UPDATE ON public.nspire_deficiency_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed standard NSPIRE codes
INSERT INTO public.nspire_deficiency_codes (code, category, name, description, default_severity, default_cure_days) VALUES
  -- Life-threatening (24-hour)
  ('U-FIRE-EXIT-BLOCKED', 'unit', 'Blocked Fire Exit', 'Egress route blocked or non-functional', 'life_threatening', 1),
  ('U-CO-DETECTOR-MISSING', 'unit', 'Missing/Inoperable CO Detector', 'Carbon monoxide detector missing or non-functional', 'life_threatening', 1),
  ('U-SMOKE-DETECTOR-MISSING', 'unit', 'Missing/Inoperable Smoke Detector', 'Smoke detector missing, disabled, or non-functional', 'life_threatening', 1),
  ('U-GAS-LEAK', 'unit', 'Gas Leak', 'Active gas leak detected', 'life_threatening', 1),
  ('U-ELEC-EXPOSED', 'unit', 'Exposed Electrical Wiring', 'Live wiring exposed creating shock/fire risk', 'life_threatening', 1),
  ('I-FIRE-SUPPRESSION', 'inside', 'Fire Suppression Compromised', 'Sprinklers/standpipes inoperable', 'life_threatening', 1),
  -- Severe (30-day)
  ('U-HEAT-INADEQUATE', 'unit', 'Inadequate Heating', 'Unit cannot maintain 68F in habitable rooms', 'severe', 30),
  ('U-WATER-LEAK-MAJOR', 'unit', 'Major Water Leak', 'Active major leak causing damage', 'severe', 30),
  ('U-SEWAGE-BACKUP', 'unit', 'Sewage Backup', 'Sewage backup in unit', 'severe', 30),
  ('U-INFESTATION-SEVERE', 'unit', 'Severe Pest Infestation', 'Severe rodent/insect infestation', 'severe', 30),
  ('U-MOLD-VISIBLE', 'unit', 'Visible Mold Growth', 'Significant visible mold', 'severe', 30),
  ('U-WINDOW-BROKEN', 'unit', 'Broken Window', 'Window broken/missing/non-secure', 'severe', 30),
  ('U-DOOR-LOCK-INOP', 'unit', 'Inoperable Entry Door Lock', 'Entry door cannot be locked/secured', 'severe', 30),
  ('U-BATHROOM-INOP', 'unit', 'Inoperable Bathroom Fixture', 'Toilet/tub/shower non-functional', 'severe', 30),
  ('U-KITCHEN-STOVE', 'unit', 'Inoperable Stove/Range', 'Stove or range non-functional', 'severe', 30),
  ('U-KITCHEN-REFRIG', 'unit', 'Inoperable Refrigerator', 'Refrigerator non-functional', 'severe', 30),
  ('I-COMMON-LIGHT', 'inside', 'Common Area Lighting', 'Common area lighting failure', 'severe', 30),
  ('I-ELEVATOR-OOS', 'inside', 'Elevator Out of Service', 'Elevator inoperable in multi-story', 'severe', 30),
  -- Moderate (30-day)
  ('U-PAINT-PEELING', 'unit', 'Peeling Paint', 'Peeling paint (not lead-based)', 'moderate', 30),
  ('U-FLOOR-DAMAGED', 'unit', 'Damaged Flooring', 'Floor damage creating trip hazard', 'moderate', 30),
  ('U-CABINET-DAMAGED', 'unit', 'Damaged Cabinetry', 'Cabinets damaged or non-functional', 'moderate', 30),
  ('U-WALL-HOLE', 'unit', 'Hole in Wall', 'Hole in wall larger than nail-size', 'moderate', 30),
  ('U-CEILING-DAMAGED', 'unit', 'Ceiling Damage', 'Damaged ceiling, water stains', 'moderate', 30),
  ('U-OUTLET-MISSING-COVER', 'unit', 'Missing Outlet Cover', 'Electrical outlet cover missing/broken', 'moderate', 30),
  ('U-SCREEN-MISSING', 'unit', 'Missing/Damaged Screens', 'Window screens missing or torn', 'moderate', 30),
  ('I-HALLWAY-CLEAN', 'inside', 'Hallway Cleanliness', 'Common hall trash/debris', 'moderate', 30),
  ('O-LANDSCAPE', 'outside', 'Overgrown Landscaping', 'Overgrown vegetation', 'moderate', 30),
  ('O-WALKWAY-CRACK', 'outside', 'Cracked Walkway', 'Cracked/uneven walkway', 'moderate', 30),
  ('O-GUTTER-DAMAGED', 'outside', 'Damaged Gutters', 'Gutters detached or damaged', 'moderate', 30),
  ('O-ROOF-DAMAGED', 'outside', 'Roof Damage', 'Visible roof damage', 'moderate', 30),
  ('O-SIDING-DAMAGED', 'outside', 'Damaged Siding', 'Siding loose, missing or damaged', 'moderate', 30),
  -- Low (60-day)
  ('U-COSMETIC', 'unit', 'Cosmetic Wear', 'Minor cosmetic issues', 'low', 60),
  ('I-COMMON-COSMETIC', 'inside', 'Common Area Cosmetic', 'Minor common area cosmetic', 'low', 60),
  ('O-COSMETIC', 'outside', 'Exterior Cosmetic', 'Exterior cosmetic issues', 'low', 60)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Special Claims (HUD Form 52671)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agency_special_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL,
  tenant_id UUID,
  unit_id UUID,
  property_id UUID,
  claim_type TEXT NOT NULL CHECK (claim_type IN ('unpaid_rent','vacancy_loss','damages')),
  claim_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  approved_amount NUMERIC(12,2),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('draft','submitted','under_review','approved','denied','paid','cancelled')),
  description TEXT,
  vacancy_start DATE,
  vacancy_end DATE,
  move_out_date DATE,
  submitted_date DATE DEFAULT CURRENT_DATE,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  decision_date DATE,
  denial_reason TEXT,
  paid_date DATE,
  hap_batch_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_special_claims_agency ON public.agency_special_claims(agency_id, status);
CREATE INDEX idx_special_claims_landlord ON public.agency_special_claims(landlord_id, status);

ALTER TABLE public.agency_special_claims ENABLE ROW LEVEL SECURITY;

-- Landlords can view/manage their own claims
CREATE POLICY "Landlords view their own special claims"
  ON public.agency_special_claims FOR SELECT TO authenticated
  USING (landlord_id = auth.uid() OR public.is_agency_staff(auth.uid(), agency_id) OR public.is_admin(auth.uid()));

CREATE POLICY "Landlords create their own special claims"
  ON public.agency_special_claims FOR INSERT TO authenticated
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Landlords update their own pending claims"
  ON public.agency_special_claims FOR UPDATE TO authenticated
  USING (landlord_id = auth.uid() AND status IN ('draft','submitted'))
  WITH CHECK (landlord_id = auth.uid() AND status IN ('draft','submitted'));

-- Agency staff manage all claims at their agency
CREATE POLICY "Agency staff manage special claims"
  ON public.agency_special_claims FOR ALL TO authenticated
  USING (public.is_agency_staff(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Admins manage all special claims"
  ON public.agency_special_claims FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_special_claims_updated_at
  BEFORE UPDATE ON public.agency_special_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Special Claim Documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agency_special_claim_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES public.agency_special_claims(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_special_claim_docs_claim ON public.agency_special_claim_documents(claim_id);

ALTER TABLE public.agency_special_claim_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View claim docs if can view claim"
  ON public.agency_special_claim_documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_special_claims c
    WHERE c.id = claim_id
      AND (c.landlord_id = auth.uid() OR public.is_agency_staff(auth.uid(), c.agency_id) OR public.is_admin(auth.uid()))
  ));

CREATE POLICY "Landlords add docs to own claims"
  ON public.agency_special_claim_documents FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.agency_special_claims c
      WHERE c.id = claim_id AND c.landlord_id = auth.uid()
    )
  );

CREATE POLICY "Agency staff add docs to claims"
  ON public.agency_special_claim_documents FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND EXISTS (
      SELECT 1 FROM public.agency_special_claims c
      WHERE c.id = claim_id AND public.is_agency_staff(auth.uid(), c.agency_id)
    )
  );

CREATE POLICY "Landlord delete own docs"
  ON public.agency_special_claim_documents FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "Agency staff delete claim docs"
  ON public.agency_special_claim_documents FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.agency_special_claims c
    WHERE c.id = claim_id AND public.is_agency_staff(auth.uid(), c.agency_id)
  ));
