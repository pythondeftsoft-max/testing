
ALTER TABLE public.housing_authorities
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS offboarded_at timestamptz,
  ADD COLUMN IF NOT EXISTS offboarded_reason text,
  ADD COLUMN IF NOT EXISTS offboarded_by uuid;

CREATE INDEX IF NOT EXISTS idx_housing_authorities_status ON public.housing_authorities(status);
