-- Add reason and metadata parameters to admin_upsert_unit function

DROP FUNCTION IF EXISTS public.admin_upsert_unit(uuid, jsonb, uuid);

CREATE OR REPLACE FUNCTION public.admin_upsert_unit(
  p_property_id uuid,
  p_unit_data jsonb,
  p_unit_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'Admin action',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_unit_id uuid;
  v_action text;
  v_amenities text[];
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can upsert units';
  END IF;

  -- Parse amenities from JSON string to array
  IF (p_unit_data->>'amenities') IS NOT NULL AND (p_unit_data->>'amenities') != '' THEN
    BEGIN
      v_amenities := ARRAY(SELECT jsonb_array_elements_text((p_unit_data->>'amenities')::jsonb));
    EXCEPTION WHEN OTHERS THEN
      v_amenities := NULL;
    END;
  ELSE
    v_amenities := NULL;
  END IF;

  IF p_unit_id IS NULL THEN
    -- Insert new unit
    INSERT INTO public.property_units (
      property_id,
      unit_number,
      unit_name,
      bedrooms,
      bathrooms,
      square_feet,
      monthly_rent,
      status,
      tenant_type,
      has_voucher,
      pha_portion,
      tenant_portion,
      description,
      security_deposit_amount,
      lease_start_date,
      lease_end_date,
      move_in_date,
      unit_amenities,
      created_at,
      updated_at
    ) VALUES (
      p_property_id,
      NULLIF(p_unit_data->>'unit_number', ''),
      NULLIF(p_unit_data->>'unit_name', ''),
      NULLIF(p_unit_data->>'bedrooms', '')::integer,
      NULLIF(p_unit_data->>'bathrooms', '')::numeric,
      NULLIF(p_unit_data->>'square_feet', '')::integer,
      NULLIF(p_unit_data->>'monthly_rent', '')::numeric,
      COALESCE(NULLIF(p_unit_data->>'status', ''), 'vacant'),
      NULLIF(p_unit_data->>'tenant_type', ''),
      COALESCE((p_unit_data->>'has_voucher')::boolean, false),
      NULLIF(p_unit_data->>'pha_portion', '')::numeric,
      NULLIF(p_unit_data->>'tenant_portion', '')::numeric,
      NULLIF(p_unit_data->>'description', ''),
      NULLIF(p_unit_data->>'security_deposit_amount', '')::numeric,
      NULLIF(p_unit_data->>'lease_start_date', '')::date,
      NULLIF(p_unit_data->>'lease_end_date', '')::date,
      NULLIF(p_unit_data->>'move_in_date', '')::date,
      v_amenities,
      now(),
      now()
    )
    RETURNING id INTO v_unit_id;

    v_action := 'create_unit';
  ELSE
    -- Update existing unit
    UPDATE public.property_units
    SET
      unit_number = COALESCE(NULLIF(p_unit_data->>'unit_number', ''), unit_number),
      unit_name = COALESCE(NULLIF(p_unit_data->>'unit_name', ''), unit_name),
      bedrooms = COALESCE(NULLIF(p_unit_data->>'bedrooms', '')::integer, bedrooms),
      bathrooms = COALESCE(NULLIF(p_unit_data->>'bathrooms', '')::numeric, bathrooms),
      square_feet = COALESCE(NULLIF(p_unit_data->>'square_feet', '')::integer, square_feet),
      monthly_rent = COALESCE(NULLIF(p_unit_data->>'monthly_rent', '')::numeric, monthly_rent),
      status = COALESCE(NULLIF(p_unit_data->>'status', ''), status),
      tenant_type = COALESCE(NULLIF(p_unit_data->>'tenant_type', ''), tenant_type),
      has_voucher = COALESCE((p_unit_data->>'has_voucher')::boolean, has_voucher),
      pha_portion = COALESCE(NULLIF(p_unit_data->>'pha_portion', '')::numeric, pha_portion),
      tenant_portion = COALESCE(NULLIF(p_unit_data->>'tenant_portion', '')::numeric, tenant_portion),
      description = COALESCE(NULLIF(p_unit_data->>'description', ''), description),
      security_deposit_amount = COALESCE(NULLIF(p_unit_data->>'security_deposit_amount', '')::numeric, security_deposit_amount),
      lease_start_date = COALESCE(NULLIF(p_unit_data->>'lease_start_date', '')::date, lease_start_date),
      lease_end_date = COALESCE(NULLIF(p_unit_data->>'lease_end_date', '')::date, lease_end_date),
      move_in_date = COALESCE(NULLIF(p_unit_data->>'move_in_date', '')::date, move_in_date),
      unit_amenities = COALESCE(v_amenities, unit_amenities),
      updated_at = now()
    WHERE id = p_unit_id
    RETURNING id INTO v_unit_id;

    v_action := 'update_unit';
  END IF;

  -- Log the action with reason and metadata
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    auth.uid(),
    v_action,
    'property_unit',
    v_unit_id,
    jsonb_build_object(
      'property_id', p_property_id,
      'unit_data', p_unit_data,
      'admin_action', true,
      'reason', p_reason,
      'additional_metadata', p_metadata
    )
  );

  RETURN v_unit_id;
END;
$$;