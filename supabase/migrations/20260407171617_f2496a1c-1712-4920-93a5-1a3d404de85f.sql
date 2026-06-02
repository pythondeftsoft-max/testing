
-- Fix 1: Documents bucket - replace overly permissive policies
DROP POLICY IF EXISTS "Landlords can view their lease documents" ON storage.objects;
DROP POLICY IF EXISTS "Landlords can delete their lease documents" ON storage.objects;
DROP POLICY IF EXISTS "Landlords can upload lease documents" ON storage.objects;

CREATE POLICY "Landlords can view their lease documents" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Landlords can upload lease documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Landlords can delete their lease documents" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Fix 2: Inspection photos - add ownership via path for write operations
DROP POLICY IF EXISTS "Authenticated users can update inspection photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete inspection photos" ON storage.objects;

CREATE POLICY "Users can update their inspection photos" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'inspection-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their inspection photos" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'inspection-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
