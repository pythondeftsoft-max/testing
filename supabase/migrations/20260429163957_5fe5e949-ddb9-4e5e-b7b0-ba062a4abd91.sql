ALTER TABLE public.housing_authorities ADD COLUMN IF NOT EXISTS zip text;
CREATE INDEX IF NOT EXISTS idx_housing_authorities_zip ON public.housing_authorities (zip);