-- Drop existing function and recreate with fixes
DROP FUNCTION IF EXISTS public.landlord_send_lease(uuid, text, text, uuid, text, date, date);

CREATE OR REPLACE FUNCTION public.landlord_send_lease(
  p_application_id uuid,
  p_lease_method text,
  p_lease_document_id text DEFAULT NULL,
  p_unit_id uuid DEFAULT NULL,
  p_landlord_signature text DEFAULT NULL,
  p_lease_start_date date DEFAULT NULL,
  p_lease_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_landlord_id uuid;
  v_tenant_id uuid;
  v_property_id uuid;
  v_monthly_rent numeric;
  v_placement_fee numeric;
  v_fee_percentage numeric;
  v_application_type text;
  v_result jsonb;
BEGIN
  -- Get placement fee percentage from platform_configs (default 40%)
  SELECT (config_value->>'percentage')::numeric INTO v_fee_percentage
  FROM platform_configs WHERE config_key = 'placement_fee_config';
  
  v_fee_percentage := COALESCE(v_fee_percentage, 40);

  -- Try marketplace_applications first
  SELECT 
    prop.owner_id,
    ma.user_id,
    ma.property_id,
    COALESCE(pu.monthly_rent, prop.monthly_rent, 0)
  INTO v_landlord_id, v_tenant_id, v_property_id, v_monthly_rent
  FROM marketplace_applications ma
  JOIN properties prop ON prop.id = ma.property_id
  LEFT JOIN property_units pu ON pu.id = p_unit_id
  WHERE ma.id = p_application_id;

  IF v_landlord_id IS NOT NULL THEN
    v_application_type := 'marketplace';
    
    UPDATE marketplace_applications
    SET 
      status = 'lease_sent',
      lease_method = p_lease_method,
      lease_document_id = p_lease_document_id,
      landlord_signature_name = p_landlord_signature,
      landlord_signed_at = CASE WHEN p_landlord_signature IS NOT NULL THEN now() ELSE NULL END,
      lease_start_date = p_lease_start_date,
      lease_end_date = p_lease_end_date,
      updated_at = now()
    WHERE id = p_application_id;
  ELSE
    -- Try property_applications
    SELECT 
      prop.owner_id,
      pa.tenant_id,
      pa.property_id,
      COALESCE(pu.monthly_rent, prop.monthly_rent, 0)
    INTO v_landlord_id, v_tenant_id, v_property_id, v_monthly_rent
    FROM property_applications pa
    JOIN properties prop ON prop.id = pa.property_id
    LEFT JOIN property_units pu ON pu.id = p_unit_id
    WHERE pa.id = p_application_id;

    IF v_landlord_id IS NOT NULL THEN
      v_application_type := 'property';
      
      UPDATE property_applications
      SET 
        status = 'lease_sent',
        lease_method = p_lease_method,
        lease_document_id = p_lease_document_id,
        landlord_signature_name = p_landlord_signature,
        landlord_signed_at = CASE WHEN p_landlord_signature IS NOT NULL THEN now() ELSE NULL END,
        lease_start_date = p_lease_start_date,
        lease_end_date = p_lease_end_date,
        updated_at = now()
      WHERE id = p_application_id;
    ELSE
      -- Try property_pushes
      SELECT 
        prop.owner_id,
        pp.tenant_id,
        pp.property_id,
        COALESCE(pu.monthly_rent, prop.monthly_rent, 0)
      INTO v_landlord_id, v_tenant_id, v_property_id, v_monthly_rent
      FROM property_pushes pp
      JOIN properties prop ON prop.id = pp.property_id
      LEFT JOIN property_units pu ON pu.id = p_unit_id
      WHERE pp.id = p_application_id;

      IF v_landlord_id IS NOT NULL THEN
        v_application_type := 'push';
        
        UPDATE property_pushes
        SET 
          status = 'lease_sent',
          lease_method = p_lease_method,
          lease_document_id = p_lease_document_id,
          landlord_signature_name = p_landlord_signature,
          landlord_signed_at = CASE WHEN p_landlord_signature IS NOT NULL THEN now() ELSE NULL END,
          lease_start_date = p_lease_start_date,
          lease_end_date = p_lease_end_date,
          updated_at = now()
      WHERE id = p_application_id;
      ELSE
        RAISE EXCEPTION 'Application not found: %', p_application_id;
      END IF;
    END IF;
  END IF;

  -- Calculate placement fee using config percentage (40% default)
  v_placement_fee := v_monthly_rent * (v_fee_percentage / 100);

  -- Update unit pipeline stage if unit_id provided
  IF p_unit_id IS NOT NULL THEN
    UPDATE property_units
    SET 
      pipeline_stage = 'lease_sent',
      current_tenant_id = v_tenant_id,
      updated_at = now()
    WHERE id = p_unit_id;
  END IF;

  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'application_id', p_application_id,
    'application_type', v_application_type,
    'lease_method', p_lease_method,
    'stripe_fee_amount', v_placement_fee,
    'stripe_session_id', null,
    'stripe_link', null,
    'message_sent', false
  );

  RETURN v_result;
END;
$function$;