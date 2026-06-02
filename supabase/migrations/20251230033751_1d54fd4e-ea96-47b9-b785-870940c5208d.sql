-- Fix check_messaging_quota to cast enum status to text before comparison
CREATE OR REPLACE FUNCTION public.check_messaging_quota(
  p_application_id uuid,
  p_tenant_id uuid
)
RETURNS TABLE(can_message boolean, messages_remaining integer, reason text, is_primary boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_id uuid;
  v_application_status text;
  v_push_status text;
  v_is_push boolean := false;
  v_landlord_messages integer := 0;
  v_messages_sent integer := 0;
  v_is_primary boolean := false;
  -- Terminal statuses
  v_terminal_property_app_statuses text[] := ARRAY['withdrawn', 'rejected', 'denied', 'expired', 'cancelled'];
  v_terminal_marketplace_statuses text[] := ARRAY['withdrawn', 'rejected', 'denied', 'expired', 'cancelled'];
  v_terminal_push_statuses text[] := ARRAY['denied', 'expired', 'declined'];
BEGIN
  -- First check if this is a property_push
  SELECT pp.property_id, pp.status,
         CASE WHEN pp.status = 'primary_applicant' THEN true ELSE false END
  INTO v_property_id, v_push_status, v_is_primary
  FROM property_pushes pp
  WHERE pp.id = p_application_id
    AND pp.tenant_id = p_tenant_id;
  
  IF v_property_id IS NOT NULL THEN
    v_is_push := true;
    v_application_status := v_push_status;
  ELSE
    -- Check property_applications
    SELECT pa.property_id, pa.status,
           CASE WHEN pa.status = 'primary_applicant' THEN true ELSE false END
    INTO v_property_id, v_application_status, v_is_primary
    FROM property_applications pa
    LEFT JOIN property_units pu ON pa.unit_id = pu.id
    WHERE pa.id = p_application_id
      AND pa.tenant_id = p_tenant_id;
    
    IF v_property_id IS NULL THEN
      -- Check marketplace_applications (cast enum to text)
      SELECT ma.property_id, ma.status::text,
             CASE WHEN ma.status::text = 'primary_applicant' THEN true ELSE false END
      INTO v_property_id, v_application_status, v_is_primary
      FROM marketplace_applications ma
      WHERE ma.id = p_application_id
        AND ma.user_id = p_tenant_id;
    END IF;
  END IF;
  
  -- If no matching application found
  IF v_property_id IS NULL THEN
    RETURN QUERY SELECT false, 0, 'Application not found'::text, false;
    RETURN;
  END IF;
  
  -- Count landlord messages ONLY from ACTIVE applications/pushes for this property+tenant
  SELECT COUNT(*)::integer INTO v_landlord_messages
  FROM messages m
  JOIN profiles p ON m.sender_id = p.id
  WHERE p.user_type IN ('landlord', 'property_manager')
    AND (
      -- Messages from active property pushes
      m.property_push_id IN (
        SELECT pp.id FROM property_pushes pp
        WHERE pp.property_id = v_property_id 
          AND pp.tenant_id = p_tenant_id
          AND pp.status NOT IN (SELECT unnest(v_terminal_push_statuses))
      )
      OR
      -- Messages from active property applications (with non-terminal parent marketplace apps)
      m.property_application_id IN (
        SELECT pa.id FROM property_applications pa
        LEFT JOIN marketplace_applications ma ON pa.marketplace_application_id = ma.id
        WHERE pa.property_id = v_property_id 
          AND pa.tenant_id = p_tenant_id
          AND pa.status NOT IN (SELECT unnest(v_terminal_property_app_statuses))
          AND (ma.id IS NULL OR ma.status::text NOT IN (SELECT unnest(v_terminal_marketplace_statuses)))
      )
      OR
      -- Messages from active marketplace applications (cast enum to text)
      m.marketplace_application_id IN (
        SELECT ma.id FROM marketplace_applications ma
        WHERE ma.property_id = v_property_id 
          AND ma.user_id = p_tenant_id
          AND ma.status::text NOT IN (SELECT unnest(v_terminal_marketplace_statuses))
      )
    );
  
  -- Count tenant messages ONLY from ACTIVE applications/pushes for this property+tenant
  SELECT COUNT(*)::integer INTO v_messages_sent
  FROM messages m
  WHERE m.sender_id = p_tenant_id
    AND (
      -- Messages from active property pushes
      m.property_push_id IN (
        SELECT pp.id FROM property_pushes pp
        WHERE pp.property_id = v_property_id 
          AND pp.tenant_id = p_tenant_id
          AND pp.status NOT IN (SELECT unnest(v_terminal_push_statuses))
      )
      OR
      -- Messages from active property applications (with non-terminal parent marketplace apps)
      m.property_application_id IN (
        SELECT pa.id FROM property_applications pa
        LEFT JOIN marketplace_applications ma ON pa.marketplace_application_id = ma.id
        WHERE pa.property_id = v_property_id 
          AND pa.tenant_id = p_tenant_id
          AND pa.status NOT IN (SELECT unnest(v_terminal_property_app_statuses))
          AND (ma.id IS NULL OR ma.status::text NOT IN (SELECT unnest(v_terminal_marketplace_statuses)))
      )
      OR
      -- Messages from active marketplace applications (cast enum to text)
      m.marketplace_application_id IN (
        SELECT ma.id FROM marketplace_applications ma
        WHERE ma.property_id = v_property_id 
          AND ma.user_id = p_tenant_id
          AND ma.status::text NOT IN (SELECT unnest(v_terminal_marketplace_statuses))
      )
    );
  
  -- If landlord has messaged, tenant can reply unlimited
  IF v_landlord_messages > 0 THEN
    RETURN QUERY SELECT true, 999999, 'Landlord initiated contact - unlimited replies'::text, v_is_primary;
    RETURN;
  END IF;
  
  -- Tenant has not received landlord message yet - cannot message first
  RETURN QUERY SELECT false, 0, 'Waiting for landlord to initiate contact'::text, v_is_primary;
  RETURN;
END;
$$;