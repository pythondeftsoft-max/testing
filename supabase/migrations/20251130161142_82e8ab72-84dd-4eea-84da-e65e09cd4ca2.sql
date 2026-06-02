-- Drop the existing policy
DROP POLICY IF EXISTS "Tenants can view documents for their approved properties" ON storage.objects;

-- Create updated policy that checks BOTH property_applications AND marketplace_applications
CREATE POLICY "Tenants can view documents for their approved properties" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'property-documents'
  AND auth.uid() IS NOT NULL
  AND (
    -- Original: Check property_applications
    EXISTS (
      SELECT 1
      FROM property_applications pa
      JOIN properties p ON pa.property_id = p.id
      WHERE p.id = (storage.foldername(objects.name))[1]::uuid
        AND pa.tenant_id = auth.uid()
        AND pa.status = 'approved'
    )
    OR
    -- NEW: Check marketplace_applications (for marketplace tenants)
    EXISTS (
      SELECT 1
      FROM marketplace_applications ma
      JOIN properties p ON ma.property_id = p.id
      WHERE p.id = (storage.foldername(objects.name))[1]::uuid
        AND ma.user_id = auth.uid()
        AND ma.status IN ('submitted', 'lease_signed', 'housed')
    )
  )
);