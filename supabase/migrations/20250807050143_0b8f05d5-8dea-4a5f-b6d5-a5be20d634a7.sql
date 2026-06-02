-- Update the send-tenant-invitation edge function to create tenant_invitations records
-- and add proper notification support

-- First, let's make sure we have proper functions for tenant invitation management
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Function to accept tenant invitation
CREATE OR REPLACE FUNCTION public.accept_tenant_invitation(p_invitation_token TEXT, p_user_id UUID)
RETURNS TABLE(success BOOLEAN, message TEXT, property_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record RECORD;
  property_record RECORD;
BEGIN
  -- Find the invitation
  SELECT * INTO invitation_record 
  FROM tenant_invitations 
  WHERE invitation_token = p_invitation_token 
    AND status = 'pending' 
    AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired invitation'::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  -- Get property details
  SELECT * INTO property_record
  FROM properties 
  WHERE id = invitation_record.property_id;
  
  -- Update invitation as accepted
  UPDATE tenant_invitations 
  SET status = 'accepted',
      accepted_at = NOW(),
      tenant_id = p_user_id,
      updated_at = NOW()
  WHERE invitation_token = p_invitation_token;
  
  -- Create property application
  INSERT INTO property_applications (
    property_id,
    tenant_id,
    status,
    application_data,
    created_at,
    updated_at
  ) VALUES (
    invitation_record.property_id,
    p_user_id,
    'approved',
    jsonb_build_object(
      'invitation_accepted', true,
      'tenant_type', invitation_record.tenant_type,
      'monthly_rent', invitation_record.monthly_rent,
      'tenant_portion', invitation_record.tenant_portion,
      'pha_portion', invitation_record.pha_portion
    ),
    NOW(),
    NOW()
  );
  
  -- Update property status to occupied
  UPDATE properties 
  SET occupancy_status = 'occupied',
      on_market = false,
      updated_at = NOW()
  WHERE id = invitation_record.property_id;
  
  -- Create rent split if it's a voucher tenant
  IF invitation_record.tenant_type = 'voucher' AND invitation_record.tenant_portion IS NOT NULL THEN
    INSERT INTO rent_splits (
      property_id,
      tenant_id,
      total_rent,
      tenant_portion,
      pha_portion,
      effective_date,
      is_active
    ) VALUES (
      invitation_record.property_id,
      p_user_id,
      invitation_record.monthly_rent,
      invitation_record.tenant_portion,
      invitation_record.pha_portion,
      COALESCE(invitation_record.lease_start_date::DATE, CURRENT_DATE),
      true
    );
  END IF;
  
  -- Send notification to landlord
  INSERT INTO notifications (
    user_id,
    title,
    description,
    type,
    link,
    is_read
  ) VALUES (
    invitation_record.landlord_id,
    'Tenant Invitation Accepted',
    invitation_record.tenant_name || ' has accepted the invitation for ' || property_record.address,
    'success',
    '/dashboard?propertyId=' || invitation_record.property_id,
    false
  );
  
  RETURN QUERY SELECT TRUE, 'Invitation accepted successfully'::TEXT, invitation_record.property_id;
END;
$$;