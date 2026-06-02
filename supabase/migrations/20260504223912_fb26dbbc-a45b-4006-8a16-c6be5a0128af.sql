CREATE OR REPLACE FUNCTION public.admin_mark_lease_signed(p_unit_id uuid, p_send_stripe boolean DEFAULT true)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_application RECORD;
  v_property RECORD;
  v_tenant RECORD;
  v_result JSON;
BEGIN
  SELECT * INTO v_application
  FROM property_applications
  WHERE unit_id = p_unit_id
    AND is_primary_applicant = true
  LIMIT 1;

  IF v_application IS NULL THEN
    RAISE EXCEPTION 'No primary applicant found for this unit';
  END IF;

  SELECT * INTO v_property FROM property_units WHERE id = p_unit_id;
  SELECT * INTO v_tenant FROM profiles WHERE id = v_application.tenant_id;

  UPDATE property_units
  SET pipeline_stage = 'lease_signed',
      status = 'paused',
      on_market = false,
      updated_at = NOW()
  WHERE id = p_unit_id;

  UPDATE profiles
  SET pipeline_stage = 'approved_awaiting',
      updated_at = NOW()
  WHERE id = v_application.tenant_id;

  UPDATE property_applications
  SET landlord_signed_at = NOW(),
      tenant_signed_at = NOW(),
      lease_fully_executed_at = NOW(),
      updated_at = NOW()
  WHERE id = v_application.id;

  -- Mark winning push as lease_signed
  UPDATE property_pushes
  SET status = 'lease_signed',
      lease_fully_executed_at = COALESCE(lease_fully_executed_at, NOW()),
      updated_at = NOW()
  WHERE unit_id = p_unit_id
    AND tenant_id = v_application.tenant_id
    AND status NOT IN ('lease_signed', 'denied', 'expired');

  -- Auto-deny all other non-terminal pushes on this unit (drops backups from slot view)
  UPDATE property_pushes
  SET status = 'denied',
      notes = COALESCE(NULLIF(notes, '') || E'\n', '') || 'Auto-closed: lease signed with another applicant',
      updated_at = NOW()
  WHERE unit_id = p_unit_id
    AND tenant_id <> v_application.tenant_id
    AND status NOT IN ('lease_signed', 'denied', 'expired');

  INSERT INTO admin_action_logs (
    admin_user_id, action, resource_type, resource_id, details, reason
  ) VALUES (
    auth.uid(), 'mark_lease_signed', 'property_unit', p_unit_id,
    jsonb_build_object(
      'tenant_id', v_application.tenant_id,
      'application_id', v_application.id,
      'send_stripe', p_send_stripe
    ),
    'Admin marked lease as signed'
  );

  v_result := json_build_object(
    'success', true,
    'application_id', v_application.id,
    'tenant_id', v_application.tenant_id,
    'property_id', v_property.property_id,
    'unit_id', p_unit_id,
    'send_stripe', p_send_stripe
  );

  RETURN v_result;
END;
$function$;