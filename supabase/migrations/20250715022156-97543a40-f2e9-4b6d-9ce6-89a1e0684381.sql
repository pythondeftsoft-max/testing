-- Allow tenants to save lease renewal contract documents
-- Update RLS policy for property_documents to allow tenants to save lease renewal contracts

CREATE POLICY "Tenants can create lease renewal contract documents" ON property_documents
FOR INSERT WITH CHECK (
  document_type = 'lease_renewal_contract'
  AND EXISTS (
    SELECT 1 FROM property_applications pa
    WHERE pa.property_id = property_documents.property_id
    AND pa.tenant_id = auth.uid()
    AND pa.status = 'approved'
  )
);