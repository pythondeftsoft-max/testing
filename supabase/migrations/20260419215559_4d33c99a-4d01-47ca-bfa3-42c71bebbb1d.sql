-- Add public waitlist portal columns to housing_authorities
ALTER TABLE public.housing_authorities
  ADD COLUMN IF NOT EXISTS public_waitlist_open boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_waitlist_message text,
  ADD COLUMN IF NOT EXISTS public_waitlist_required_fields jsonb NOT NULL DEFAULT '{
    "household_composition": true,
    "income": true,
    "address_history": true,
    "preferences": true,
    "demographics": false
  }'::jsonb;

-- Add submission tracking to voucher_applications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'voucher_application_source'
  ) THEN
    CREATE TYPE public.voucher_application_source AS ENUM ('public', 'staff', 'imported');
  END IF;
END$$;

ALTER TABLE public.voucher_applications
  ADD COLUMN IF NOT EXISTS application_number text,
  ADD COLUMN IF NOT EXISTS submission_source public.voucher_application_source NOT NULL DEFAULT 'staff',
  ADD COLUMN IF NOT EXISTS submission_ip text,
  ADD COLUMN IF NOT EXISTS submitted_household_data jsonb,
  ADD COLUMN IF NOT EXISTS submitted_address_history jsonb,
  ADD COLUMN IF NOT EXISTS submitted_preferences jsonb,
  ADD COLUMN IF NOT EXISTS submitted_demographics jsonb;

-- Unique application number per agency
CREATE UNIQUE INDEX IF NOT EXISTS voucher_applications_agency_app_number_unique
  ON public.voucher_applications (agency_id, application_number)
  WHERE application_number IS NOT NULL;

-- Public waitlist submission audit log (visibility/anti-abuse signal)
CREATE TABLE IF NOT EXISTS public.public_waitlist_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  application_id uuid REFERENCES public.voucher_applications(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  email text,
  status text NOT NULL DEFAULT 'submitted',
  submitted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_waitlist_submissions_agency
  ON public.public_waitlist_submissions (agency_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_waitlist_submissions_ip
  ON public.public_waitlist_submissions (ip_address, submitted_at DESC);

ALTER TABLE public.public_waitlist_submissions ENABLE ROW LEVEL SECURITY;

-- Agency staff can view their own agency's submission audit
DROP POLICY IF EXISTS "Agency staff view own waitlist submissions"
  ON public.public_waitlist_submissions;
CREATE POLICY "Agency staff view own waitlist submissions"
  ON public.public_waitlist_submissions
  FOR SELECT
  USING (public.is_agency_staff(auth.uid(), agency_id));

-- Service role only writes (edge function); no client-side insert/update/delete policies

-- Sequence helper to generate application numbers per agency per year
CREATE TABLE IF NOT EXISTS public.application_number_sequences (
  agency_id uuid NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  year int NOT NULL,
  last_seq int NOT NULL DEFAULT 0,
  PRIMARY KEY (agency_id, year)
);

ALTER TABLE public.application_number_sequences ENABLE ROW LEVEL SECURITY;
-- No client policies; service role only

CREATE OR REPLACE FUNCTION public.next_application_number(p_agency_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM now())::int;
  v_seq int;
  v_code text;
BEGIN
  INSERT INTO public.application_number_sequences (agency_id, year, last_seq)
  VALUES (p_agency_id, v_year, 1)
  ON CONFLICT (agency_id, year)
  DO UPDATE SET last_seq = public.application_number_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  SELECT COALESCE(NULLIF(pha_code, ''), UPPER(SUBSTRING(REPLACE(slug, '-', ''), 1, 6)))
  INTO v_code
  FROM public.housing_authorities
  WHERE id = p_agency_id;

  RETURN COALESCE(v_code, 'PHA') || '-' || v_year || '-' || LPAD(v_seq::text, 5, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_application_number(uuid) TO service_role;