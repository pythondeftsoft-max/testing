-- 1. Add last_stage_change_at to prospect status
ALTER TABLE public.pha_prospect_status
  ADD COLUMN IF NOT EXISTS last_stage_change_at timestamptz NOT NULL DEFAULT now();

-- 2. Add last_stage_change_at to agency_leads
ALTER TABLE public.agency_leads
  ADD COLUMN IF NOT EXISTS last_stage_change_at timestamptz NOT NULL DEFAULT now();

-- 3. Trigger function to bump last_stage_change_at when status changes
CREATE OR REPLACE FUNCTION public.bump_last_stage_change_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status)
     OR TG_OP = 'INSERT' THEN
    NEW.last_stage_change_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_stage_change_prospect ON public.pha_prospect_status;
CREATE TRIGGER trg_bump_stage_change_prospect
  BEFORE INSERT OR UPDATE ON public.pha_prospect_status
  FOR EACH ROW EXECUTE FUNCTION public.bump_last_stage_change_at();

DROP TRIGGER IF EXISTS trg_bump_stage_change_lead ON public.agency_leads;
CREATE TRIGGER trg_bump_stage_change_lead
  BEFORE INSERT OR UPDATE ON public.agency_leads
  FOR EACH ROW EXECUTE FUNCTION public.bump_last_stage_change_at();

-- 4. Storage bucket for prospect/deal files (private, admin-only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('prospect-files', 'prospect-files', false)
ON CONFLICT (id) DO NOTHING;

-- 5. RLS policies on storage.objects for prospect-files
DROP POLICY IF EXISTS "Admins can read prospect files" ON storage.objects;
CREATE POLICY "Admins can read prospect files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'prospect-files' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can upload prospect files" ON storage.objects;
CREATE POLICY "Admins can upload prospect files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'prospect-files' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update prospect files" ON storage.objects;
CREATE POLICY "Admins can update prospect files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'prospect-files' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete prospect files" ON storage.objects;
CREATE POLICY "Admins can delete prospect files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'prospect-files' AND public.is_admin(auth.uid()));