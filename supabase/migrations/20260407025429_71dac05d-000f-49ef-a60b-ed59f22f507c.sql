DROP INDEX IF EXISTS idx_housing_authorities_pha_code;
ALTER TABLE public.housing_authorities
  ADD CONSTRAINT housing_authorities_pha_code_key UNIQUE (pha_code);