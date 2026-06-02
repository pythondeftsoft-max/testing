
-- Create inspection-photos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspection-photos', 'inspection-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view inspection photos
CREATE POLICY "Authenticated users can view inspection photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'inspection-photos');

-- Allow authenticated users to upload inspection photos
CREATE POLICY "Authenticated users can upload inspection photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inspection-photos');

-- Allow authenticated users to update their own inspection photos
CREATE POLICY "Authenticated users can update inspection photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'inspection-photos');

-- Allow authenticated users to delete inspection photos
CREATE POLICY "Authenticated users can delete inspection photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'inspection-photos');

-- Allow public/anon read access to rfta_packets by share_token for the submission form
CREATE POLICY "Anyone can read rfta_packets by share_token"
ON public.rfta_packets FOR SELECT
TO anon, authenticated
USING (share_token IS NOT NULL);

-- Allow anon users to update rfta_packets tenant_data/landlord_data via share_token
CREATE POLICY "Anyone can update rfta_packets via share_token"
ON public.rfta_packets FOR UPDATE
TO anon, authenticated
USING (share_token IS NOT NULL)
WITH CHECK (share_token IS NOT NULL);
