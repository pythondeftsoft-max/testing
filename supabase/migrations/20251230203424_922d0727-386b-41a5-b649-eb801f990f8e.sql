CREATE OR REPLACE FUNCTION public.landlord_cancel_lease(
  p_property_push_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_push RECORD;
BEGIN
  -- Get the property push with owner_id from properties
  SELECT pp.*, p.owner_id 
  INTO v_push
  FROM property_pushes pp
  JOIN properties p ON p.id = pp.property_id
  WHERE pp.id = p_property_push_id;
  
  IF v_push IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Property push not found');
  END IF;
  
  -- Verify the caller is the landlord (using owner_id)
  IF v_push.owner_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Check if tenant has already signed
  IF v_push.tenant_signature_name IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel - tenant has already signed the lease');
  END IF;
  
  -- Check if status is lease_sent
  IF v_push.status != 'lease_sent' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lease has not been sent or is already canceled');
  END IF;
  
  -- Reset the push to primary_applicant status and clear lease fields
  UPDATE property_pushes
  SET 
    status = 'primary_applicant',
    landlord_signature_name = NULL,
    landlord_signed_at = NULL,
    lease_method = NULL,
    lease_document_id = NULL,
    lease_start_date = NULL,
    lease_end_date = NULL,
    monthly_rent = NULL,
    updated_at = now()
  WHERE id = p_property_push_id;
  
  RETURN jsonb_build_object('success', true, 'message', 'Lease canceled successfully');
END;
$$;