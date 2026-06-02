
-- 1. Add 'pending_review' to landlord_onboarding_status enum
ALTER TYPE public.landlord_onboarding_status ADD VALUE IF NOT EXISTS 'pending_review';

-- 2. Add requirement columns to agency_landlords
ALTER TABLE public.agency_landlords 
  ADD COLUMN IF NOT EXISTS requirements_notes text,
  ADD COLUMN IF NOT EXISTS w9_required boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS additional_docs_required text[];

-- 3. Create agency_landlord_units junction table
CREATE TABLE IF NOT EXISTS public.agency_landlord_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_landlord_id uuid NOT NULL REFERENCES public.agency_landlords(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_id uuid REFERENCES public.property_units(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_landlord_id, property_id, unit_id)
);

-- 4. Enable RLS
ALTER TABLE public.agency_landlord_units ENABLE ROW LEVEL SECURITY;

-- 5. RLS: Landlords can see their own unit registrations
CREATE POLICY "Landlords can view own unit registrations"
  ON public.agency_landlord_units FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_landlords al
      WHERE al.id = agency_landlord_id
        AND al.landlord_id = auth.uid()
    )
  );

-- 6. RLS: Agency staff can view units for their agency's landlords
CREATE POLICY "Agency staff can view unit registrations"
  ON public.agency_landlord_units FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_landlords al
      JOIN public.agency_staff s ON s.agency_id = al.agency_id
      WHERE al.id = agency_landlord_id
        AND s.user_id = auth.uid()
        AND s.is_active = true
    )
  );

-- 7. RLS: Landlords can insert their own unit registrations
CREATE POLICY "Landlords can insert unit registrations"
  ON public.agency_landlord_units FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_landlords al
      WHERE al.id = agency_landlord_id
        AND al.landlord_id = auth.uid()
    )
  );

-- 8. RLS: Landlords can delete their own unit registrations
CREATE POLICY "Landlords can delete own unit registrations"
  ON public.agency_landlord_units FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_landlords al
      WHERE al.id = agency_landlord_id
        AND al.landlord_id = auth.uid()
    )
  );

-- 9. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agency_landlord_units_landlord ON public.agency_landlord_units(agency_landlord_id);
CREATE INDEX IF NOT EXISTS idx_agency_landlord_units_property ON public.agency_landlord_units(property_id);

-- 10. Updated_at trigger
CREATE TRIGGER update_agency_landlord_units_updated_at
  BEFORE UPDATE ON public.agency_landlord_units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
