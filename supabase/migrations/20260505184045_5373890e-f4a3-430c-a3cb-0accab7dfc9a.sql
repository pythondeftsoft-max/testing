
-- 1. Inspection photos: drop overly broad policies and re-create scoped ones
DROP POLICY IF EXISTS "Agency staff can view inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Agency staff can upload inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Agency staff can update inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Agency staff can delete inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Inspection photos viewable by agency staff" ON storage.objects;
DROP POLICY IF EXISTS "Inspection photos uploadable by agency staff" ON storage.objects;
DROP POLICY IF EXISTS "Inspection photos updatable by agency staff" ON storage.objects;
DROP POLICY IF EXISTS "Inspection photos deletable by agency staff" ON storage.objects;

CREATE POLICY "Inspection photos: agency-scoped read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'inspection-photos' AND (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1
      FROM public.inspection_photos ip
      JOIN public.inspections i ON i.id = ip.inspection_id
      JOIN public.agency_staff s ON s.agency_id = i.agency_id
      WHERE s.user_id = auth.uid()
        AND s.is_active = true
        AND ip.file_path = storage.objects.name
    )
  )
);

CREATE POLICY "Inspection photos: agency-scoped insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inspection-photos' AND (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.agency_staff s
      WHERE s.user_id = auth.uid() AND s.is_active = true
    )
  )
);

CREATE POLICY "Inspection photos: agency-scoped update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'inspection-photos' AND (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1
      FROM public.inspection_photos ip
      JOIN public.inspections i ON i.id = ip.inspection_id
      JOIN public.agency_staff s ON s.agency_id = i.agency_id
      WHERE s.user_id = auth.uid()
        AND s.is_active = true
        AND ip.file_path = storage.objects.name
    )
  )
);

CREATE POLICY "Inspection photos: agency-scoped delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'inspection-photos' AND (
    public.is_admin(auth.uid()) OR EXISTS (
      SELECT 1
      FROM public.inspection_photos ip
      JOIN public.inspections i ON i.id = ip.inspection_id
      JOIN public.agency_staff s ON s.agency_id = i.agency_id
      WHERE s.user_id = auth.uid()
        AND s.is_active = true
        AND ip.file_path = storage.objects.name
    )
  )
);

-- 2. Message attachments: make bucket private (RLS already restricts to participants)
UPDATE storage.buckets SET public = false WHERE id = 'message-attachments';

-- 3. RFP library: require public_facing for anonymous reads
DROP POLICY IF EXISTS "Public can view published RFP entries" ON public.rfp_response_library;
DROP POLICY IF EXISTS "Anyone can view published RFP entries" ON public.rfp_response_library;
DROP POLICY IF EXISTS "Public read published rfp entries" ON public.rfp_response_library;

CREATE POLICY "Public can view public-facing published RFP entries"
ON public.rfp_response_library FOR SELECT
TO anon, authenticated
USING (is_published = true AND public_facing = true);

CREATE POLICY "Agency staff and admins can view all RFP entries"
ON public.rfp_response_library FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.agency_staff s
    WHERE s.user_id = auth.uid() AND s.is_active = true
  )
);
