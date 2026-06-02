-- Create message-attachments bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true);

-- RLS policy: Users can upload their own attachments
CREATE POLICY "Users can upload message attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'message-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS policy: Users can read all message attachments
CREATE POLICY "Anyone can view message attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'message-attachments');

-- RLS policy: Users can delete their own attachments
CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);