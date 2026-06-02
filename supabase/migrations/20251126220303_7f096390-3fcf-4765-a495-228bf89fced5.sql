-- Fix tenant_sign_marketplace_lease to use correct status enum value
CREATE OR REPLACE FUNCTION tenant_sign_marketplace_lease(
  p_application_id UUID,
  p_tenant_signature TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_application RECORD;
  v_message_id UUID;
BEGIN
  -- Get the application details
  SELECT * INTO v_application
  FROM marketplace_applications
  WHERE id = p_application_id
    AND user_id = auth.uid()
    AND lifecycle_stage IN ('lease_sent', 'applicant', 'screening', 'approved');

  IF v_application.id IS NULL THEN
    RAISE EXCEPTION 'Application not found or unauthorized';
  END IF;

  -- Update application with tenant signature (FIXED: use 'lease_signed' instead of 'lease_executed')
  UPDATE marketplace_applications
  SET 
    tenant_signature_name = p_tenant_signature,
    tenant_signed_at = NOW(),
    lifecycle_stage = 'lease_executed',
    status = 'lease_signed',
    updated_at = NOW()
  WHERE id = p_application_id;

  -- Send message to landlord about fully executed lease
  INSERT INTO messages (
    sender_id,
    marketplace_application_id,
    message_text,
    topic,
    extension,
    payload,
    created_by_tenant,
    read_by_tenant,
    read_by_landlord
  ) VALUES (
    auth.uid(),
    p_application_id,
    'The tenant has signed the lease agreement. The lease is now fully executed.',
    'Lease Fully Executed',
    'lease_executed',
    jsonb_build_object(
      'tenant_signature', p_tenant_signature,
      'signed_at', NOW()
    ),
    true,
    true,
    false
  )
  RETURNING id INTO v_message_id;

  RETURN json_build_object(
    'success', true,
    'application_id', p_application_id,
    'message_id', v_message_id,
    'message', 'Lease signed successfully'
  );
END;
$$;