-- Fix maintenance request submission by removing duplicate/conflicting trigger
-- and adding storage policy for tenant file uploads

-- Drop the old conflicting trigger that causes NULL user_id errors
DROP TRIGGER IF EXISTS maintenance_request_notification_trigger ON maintenance_requests;
DROP FUNCTION IF EXISTS notify_maintenance_request();

-- The handle_maintenance_request_changes trigger already handles notifications properly
-- No need to recreate it - it's already active

-- Add storage policy to allow tenants to upload maintenance documents
-- This allows tenants to INSERT files into their own folder in maintenance-documents bucket
CREATE POLICY "Tenants can upload their maintenance documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);