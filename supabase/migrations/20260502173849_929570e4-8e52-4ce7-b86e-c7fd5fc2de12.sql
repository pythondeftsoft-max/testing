-- Additive columns on properties
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS listing_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS placement_fee_pct numeric(5,2) NOT NULL DEFAULT 40.00,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_by uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'properties_listing_status_check'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_listing_status_check
      CHECK (listing_status IN ('pending_activation','active','paused'));
  END IF;
END$$;

-- Additive column on property_units
ALTER TABLE public.property_units
  ADD COLUMN IF NOT EXISTS listing_status text NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'property_units_listing_status_check'
  ) THEN
    ALTER TABLE public.property_units
      ADD CONSTRAINT property_units_listing_status_check
      CHECK (listing_status IN ('pending_activation','active','paused'));
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_properties_listing_status
  ON public.properties (listing_status)
  WHERE listing_status <> 'active';

CREATE INDEX IF NOT EXISTS idx_property_units_listing_status
  ON public.property_units (listing_status)
  WHERE listing_status <> 'active';

-- Activation audit / signature trail
CREATE TABLE IF NOT EXISTS public.listing_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  signed_by uuid NOT NULL,
  signer_role text NOT NULL CHECK (signer_role IN ('admin','landlord')),
  signer_name text NOT NULL,
  placement_fee_pct numeric(5,2) NOT NULL,
  agreement_text text NOT NULL,
  ip_address text,
  user_agent text,
  signed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_activations_property
  ON public.listing_activations (property_id, signed_at DESC);

ALTER TABLE public.listing_activations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read all activations" ON public.listing_activations;
CREATE POLICY "admins read all activations"
  ON public.listing_activations FOR SELECT
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "landlords read own activations" ON public.listing_activations;
CREATE POLICY "landlords read own activations"
  ON public.listing_activations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = listing_activations.property_id AND p.owner_id = auth.uid()
  ));

DROP POLICY IF EXISTS "signer inserts own activation" ON public.listing_activations;
CREATE POLICY "signer inserts own activation"
  ON public.listing_activations FOR INSERT
  WITH CHECK (signed_by = auth.uid());