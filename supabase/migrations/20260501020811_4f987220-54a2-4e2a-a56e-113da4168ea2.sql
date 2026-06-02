
-- 1. agency_crm_notes: add stage + pinned for pipeline-stage notes
ALTER TABLE public.agency_crm_notes
  ADD COLUMN IF NOT EXISTS stage text,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

-- 2. agency_intake_files: track drag-and-drop onboarding uploads
CREATE TABLE IF NOT EXISTS public.agency_intake_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('tenants','landlords','vouchers','inspectors','staff','misc')),
  original_filename text,
  file_url text NOT NULL,
  mime_type text,
  size_bytes bigint,
  status text NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','parsing','ready_for_review','imported','failed','skipped')),
  parsed_rows jsonb,
  error_text text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intake_files_agency ON public.agency_intake_files(agency_id);
CREATE INDEX IF NOT EXISTS idx_intake_files_status ON public.agency_intake_files(status);

ALTER TABLE public.agency_intake_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage intake files" ON public.agency_intake_files;
CREATE POLICY "Admins manage intake files"
  ON public.agency_intake_files
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Agency staff manage own intake files" ON public.agency_intake_files;
CREATE POLICY "Agency staff manage own intake files"
  ON public.agency_intake_files
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.agency_staff s
      WHERE s.agency_id = agency_intake_files.agency_id
        AND s.user_id = auth.uid()
        AND s.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agency_staff s
      WHERE s.agency_id = agency_intake_files.agency_id
        AND s.user_id = auth.uid()
        AND s.is_active = true
    )
  );

DROP TRIGGER IF EXISTS trg_intake_files_updated_at ON public.agency_intake_files;
CREATE TRIGGER trg_intake_files_updated_at
  BEFORE UPDATE ON public.agency_intake_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Private storage bucket for onboarding intake files
INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-intake', 'onboarding-intake', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins read intake objects" ON storage.objects;
CREATE POLICY "Admins read intake objects"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'onboarding-intake' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins write intake objects" ON storage.objects;
CREATE POLICY "Admins write intake objects"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'onboarding-intake' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update intake objects" ON storage.objects;
CREATE POLICY "Admins update intake objects"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'onboarding-intake' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins delete intake objects" ON storage.objects;
CREATE POLICY "Admins delete intake objects"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'onboarding-intake' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Agency staff read own intake objects" ON storage.objects;
CREATE POLICY "Agency staff read own intake objects"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'onboarding-intake'
    AND EXISTS (
      SELECT 1 FROM public.agency_staff s
      WHERE s.user_id = auth.uid()
        AND s.is_active = true
        AND s.agency_id::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "Agency staff write own intake objects" ON storage.objects;
CREATE POLICY "Agency staff write own intake objects"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'onboarding-intake'
    AND EXISTS (
      SELECT 1 FROM public.agency_staff s
      WHERE s.user_id = auth.uid()
        AND s.is_active = true
        AND s.agency_id::text = (storage.foldername(name))[1]
    )
  );
