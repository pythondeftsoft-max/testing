-- Database migration to fix lease renewal completion logic
-- This migration adds missing functions and policies for proper lease renewal flow

-- Create function to complete lease renewal and update all related data
CREATE OR REPLACE FUNCTION public.complete_lease_renewal(
  p_renewal_id UUID,
  p_property_id UUID,
  p_tenant_id UUID,
  p_new_rent NUMERIC,
  p_new_lease_end DATE,
  p_contract_template TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_owner_id UUID;
  v_property_address TEXT;
BEGIN
  -- Get property owner and address
  SELECT owner_id, address INTO v_property_owner_id, v_property_address
  FROM properties WHERE id = p_property_id;
  
  -- Update property with new lease terms
  UPDATE properties SET
    monthly_rent = p_new_rent,
    lease_end_date = p_new_lease_end,
    lease_start_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = p_property_id;
  
  -- Update lease renewal status to completed
  UPDATE lease_renewals SET
    renewal_status = 'completed',
    updated_at = NOW()
  WHERE id = p_renewal_id;
  
  -- Save contract as property document
  INSERT INTO property_documents (
    property_id,
    document_type,
    file_name,
    file_path,
    uploaded_by,
    file_size,
    mime_type,
    metadata
  ) VALUES (
    p_property_id,
    'lease_renewal_contract',
    'Lease_Renewal_Contract_' || TO_CHAR(NOW(), 'YYYY_MM_DD_HH24_MI_SS') || '.txt',
    'contracts/lease_renewal_contract_' || p_renewal_id || '_' || EXTRACT(EPOCH FROM NOW()) || '.txt',
    v_property_owner_id,
    LENGTH(p_contract_template),
    'text/plain',
    jsonb_build_object(
      'renewal_id', p_renewal_id,
      'signed_by_landlord', true,
      'signed_by_tenant', true,
      'completion_date', NOW()
    )
  );
  
  -- Send completion notifications
  INSERT INTO notifications (user_id, title, description, type) VALUES
  (v_property_owner_id, 'Lease Renewal Completed', 
   'The lease renewal contract for ' || v_property_address || ' has been fully executed. The property lease terms have been updated.',
   'success'),
  (p_tenant_id, 'Lease Renewal Completed',
   'Your lease renewal for ' || v_property_address || ' has been completed. Your new lease terms are now in effect.',
   'success');
  
  RETURN TRUE;
END;
$$;

-- Update RLS policies to allow document access for signed contracts
CREATE POLICY "Users can view completed lease renewal contracts" ON property_documents
FOR SELECT USING (
  document_type = 'lease_renewal_contract'
  AND (
    EXISTS (
      SELECT 1 FROM properties p
      WHERE p.id = property_documents.property_id
      AND p.owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM property_applications pa
      WHERE pa.property_id = property_documents.property_id
      AND pa.tenant_id = auth.uid()
      AND pa.status = 'approved'
    )
  )
);

-- Create function to generate PDF download URL (placeholder for future PDF generation)
CREATE OR REPLACE FUNCTION public.get_contract_download_url(p_contract_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_file_path TEXT;
BEGIN
  SELECT file_path INTO v_file_path
  FROM property_documents pd
  JOIN lease_renewal_contracts lrc ON (pd.metadata->>'renewal_id')::UUID = lrc.lease_renewal_id
  WHERE lrc.id = p_contract_id
  AND document_type = 'lease_renewal_contract';
  
  -- Return download URL (in a real implementation, this would generate a signed URL)
  RETURN COALESCE(v_file_path, '');
END;
$$;