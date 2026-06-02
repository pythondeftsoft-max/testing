
-- 1) Lock down PII columns on housing_authorities
REVOKE SELECT ON public.housing_authorities FROM anon, authenticated;

-- Re-grant SELECT on every column EXCEPT email and phone
DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
  INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'housing_authorities'
    AND column_name NOT IN ('email', 'phone');

  EXECUTE format('GRANT SELECT (%s) ON public.housing_authorities TO anon, authenticated', cols);
END $$;

-- 2) Drop the overly-broad RFP public read policy; the stricter one remains
DROP POLICY IF EXISTS "Public can read published RFP responses" ON public.rfp_response_library;
