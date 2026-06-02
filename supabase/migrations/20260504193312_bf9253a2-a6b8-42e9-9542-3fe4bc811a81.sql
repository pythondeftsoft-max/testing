CREATE OR REPLACE FUNCTION public.admin_manual_fill_push_slot(
  p_unit_id uuid,
  p_tenant_id uuid,
  p_target_stage text,
  p_lease_start date DEFAULT NULL,
  p_lease_end date DEFAULT NULL,
  p_monthly_rent numeric DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit RECORD;
  v_application_id uuid;
  v_push_status text;
  v_push_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_target_stage NOT IN ('interested','lease_signed','housed_paid') THEN
    RAISE EXCEPTION 'Invalid target stage: %', p_target_stage;
  END IF;

  SELECT * INTO v_unit FROM property_units WHERE id = p_unit_id;
  IF v_unit IS NULL THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  v_push_status := CASE p_target_stage
    WHEN 'interested' THEN 'interested'
    WHEN 'lease_signed' THEN 'accepted'
    WHEN 'housed_paid' THEN 'accepted'
  END;

  INSERT INTO property_pushes (
    property_id, unit_id, tenant_id, admin_id,
    status, pushed_at, expires_at, quota_bypass
  ) VALUES (
    v_unit.property_id, p_unit_id, p_tenant_id, auth.uid(),
    v_push_status, now(), now() + interval '30 days', true
  )
  RETURNING id INTO v_push_id;

  IF p_target_stage IN ('lease_signed','housed_paid') THEN
    -- Unit-level application: property_id MUST be NULL to satisfy chk_property_or_unit_app XOR constraint
    INSERT INTO property_applications (
      property_id, unit_id, tenant_id, status,
      is_primary_applicant, push_direction,
      landlord_signed_at, tenant_signed_at, lease_fully_executed_at,
      submitted_at, status_updated_at, move_in_date,
      priority_payment_made
    ) VALUES (
      NULL, p_unit_id, p_tenant_id, 'lease_signed',
      true, 'admin_manual',
      now(), now(), now(),
      now(), now(), p_lease_start,
      (p_target_stage = 'housed_paid')
    )
    RETURNING id INTO v_application_id;

    IF p_target_stage = 'lease_signed' THEN
      UPDATE property_units
        SET pipeline_stage='lease_signed', status='paused', on_market=false,
            current_tenant_id=p_tenant_id, lease_signed_date=now(), updated_at=now()
        WHERE id = p_unit_id;
      UPDATE profiles
        SET pipeline_stage='approved_awaiting', housing_status='approved', updated_at=now()
        WHERE id = p_tenant_id;
    ELSE
      UPDATE property_units
        SET pipeline_stage='paid_housed', status='occupied', on_market=false,
            current_tenant_id=p_tenant_id, lease_signed_date=now(),
            payment_received_date=now(), updated_at=now()
        WHERE id = p_unit_id;
      UPDATE profiles
        SET pipeline_stage='housed_paid', housing_status='housed', updated_at=now()
        WHERE id = p_tenant_id;
    END IF;
  END IF;

  INSERT INTO admin_action_logs (
    admin_user_id, action, resource_type, resource_id, details, reason
  ) VALUES (
    auth.uid(), 'manual_fill_push_slot', 'property_unit', p_unit_id,
    jsonb_build_object(
      'tenant_id', p_tenant_id,
      'target_stage', p_target_stage,
      'application_id', v_application_id,
      'push_id', v_push_id,
      'lease_start', p_lease_start,
      'lease_end', p_lease_end,
      'monthly_rent', p_monthly_rent
    ),
    p_reason
  );

  RETURN json_build_object(
    'success', true,
    'application_id', v_application_id,
    'push_id', v_push_id,
    'target_stage', p_target_stage
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_primary_and_advance(
  p_unit_id uuid,
  p_tenant_id uuid,
  p_target_stage text,
  p_demote_others boolean DEFAULT false,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit RECORD;
  v_application_id uuid;
  v_demoted uuid[] := ARRAY[]::uuid[];
  v_other RECORD;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF p_target_stage NOT IN ('in_process','lease_signed','housed_paid') THEN
    RAISE EXCEPTION 'Invalid target stage: %', p_target_stage;
  END IF;

  SELECT * INTO v_unit FROM property_units WHERE id = p_unit_id;
  IF v_unit IS NULL THEN
    RAISE EXCEPTION 'Unit not found';
  END IF;

  FOR v_other IN
    SELECT id, tenant_id FROM property_pushes
    WHERE unit_id = p_unit_id
      AND tenant_id <> p_tenant_id
      AND status NOT IN ('denied','expired','withdrawn')
  LOOP
    IF p_demote_others THEN
      UPDATE property_pushes SET status='withdrawn', updated_at=now() WHERE id = v_other.id;
    ELSE
      UPDATE property_pushes SET status='matched', updated_at=now() WHERE id = v_other.id;
    END IF;
    v_demoted := array_append(v_demoted, v_other.tenant_id);
  END LOOP;

  UPDATE property_pushes
    SET status = CASE WHEN p_target_stage = 'in_process' THEN 'landlord_review' ELSE 'accepted' END,
        updated_at = now()
    WHERE unit_id = p_unit_id AND tenant_id = p_tenant_id;

  SELECT id INTO v_application_id FROM property_applications
    WHERE unit_id = p_unit_id AND tenant_id = p_tenant_id
    ORDER BY created_at DESC LIMIT 1;

  IF v_application_id IS NULL THEN
    -- Unit-level application: property_id MUST be NULL to satisfy chk_property_or_unit_app XOR constraint
    INSERT INTO property_applications (
      property_id, unit_id, tenant_id, status, is_primary_applicant,
      push_direction, submitted_at, status_updated_at,
      landlord_signed_at, tenant_signed_at, lease_fully_executed_at,
      priority_payment_made
    ) VALUES (
      NULL, p_unit_id, p_tenant_id,
      CASE p_target_stage WHEN 'in_process' THEN 'in_process' ELSE 'lease_signed' END,
      true, 'admin_manual', now(), now(),
      CASE WHEN p_target_stage IN ('lease_signed','housed_paid') THEN now() ELSE NULL END,
      CASE WHEN p_target_stage IN ('lease_signed','housed_paid') THEN now() ELSE NULL END,
      CASE WHEN p_target_stage IN ('lease_signed','housed_paid') THEN now() ELSE NULL END,
      (p_target_stage = 'housed_paid')
    )
    RETURNING id INTO v_application_id;
  ELSE
    UPDATE property_applications
      SET is_primary_applicant = true,
          status = CASE p_target_stage WHEN 'in_process' THEN 'in_process' ELSE 'lease_signed' END,
          landlord_signed_at = COALESCE(landlord_signed_at, CASE WHEN p_target_stage IN ('lease_signed','housed_paid') THEN now() END),
          tenant_signed_at = COALESCE(tenant_signed_at, CASE WHEN p_target_stage IN ('lease_signed','housed_paid') THEN now() END),
          lease_fully_executed_at = COALESCE(lease_fully_executed_at, CASE WHEN p_target_stage IN ('lease_signed','housed_paid') THEN now() END),
          priority_payment_made = priority_payment_made OR (p_target_stage = 'housed_paid'),
          status_updated_at = now(),
          updated_at = now()
      WHERE id = v_application_id;
  END IF;

  UPDATE property_applications
    SET is_primary_applicant = false, updated_at = now()
    WHERE unit_id = p_unit_id AND id <> v_application_id AND is_primary_applicant = true;

  IF p_target_stage = 'in_process' THEN
    UPDATE property_units SET pipeline_stage='in_process', current_tenant_id=p_tenant_id, updated_at=now() WHERE id=p_unit_id;
    UPDATE profiles SET pipeline_stage='in_process', updated_at=now() WHERE id=p_tenant_id;
  ELSIF p_target_stage = 'lease_signed' THEN
    UPDATE property_units SET pipeline_stage='lease_signed', status='paused', on_market=false,
      current_tenant_id=p_tenant_id, lease_signed_date=now(), updated_at=now() WHERE id=p_unit_id;
    UPDATE profiles SET pipeline_stage='approved_awaiting', housing_status='approved', updated_at=now() WHERE id=p_tenant_id;
  ELSE
    UPDATE property_units SET pipeline_stage='paid_housed', status='occupied', on_market=false,
      current_tenant_id=p_tenant_id, lease_signed_date=now(), payment_received_date=now(), updated_at=now() WHERE id=p_unit_id;
    UPDATE profiles SET pipeline_stage='housed_paid', housing_status='housed', updated_at=now() WHERE id=p_tenant_id;
  END IF;

  INSERT INTO admin_action_logs (
    admin_user_id, action, resource_type, resource_id, details, reason
  ) VALUES (
    auth.uid(), 'set_primary_and_advance', 'property_unit', p_unit_id,
    jsonb_build_object(
      'tenant_id', p_tenant_id,
      'target_stage', p_target_stage,
      'application_id', v_application_id,
      'demoted_tenant_ids', v_demoted,
      'demote_others', p_demote_others
    ),
    p_reason
  );

  RETURN json_build_object('success', true, 'application_id', v_application_id, 'demoted', v_demoted);
END;
$$;