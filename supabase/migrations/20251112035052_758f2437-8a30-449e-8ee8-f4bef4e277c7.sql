-- Drop and recreate admin_upsert_unit to fix audit logging

DROP FUNCTION IF EXISTS public.admin_upsert_unit(uuid, jsonb, uuid, text, jsonb);

CREATE OR REPLACE FUNCTION public.admin_upsert_unit(
  p_property_id uuid,
  p_unit_data jsonb,
  p_unit_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_unit_id uuid;
  v_action_type text;
  v_changes jsonb;
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can manage units';
  END IF;

  -- Determine if this is create or update
  IF p_unit_id IS NULL THEN
    v_action_type := 'create';
    v_changes := p_unit_data;
  ELSE
    v_action_type := 'update';
    v_changes := p_unit_data;
  END IF;

  -- Upsert the unit
  INSERT INTO public.property_units (
    id,
    property_id,
    unit_number,
    unit_name,
    bedrooms,
    bathrooms,
    square_feet,
    monthly_rent,
    security_deposit_amount,
    status,
    tenant_type,
    has_voucher,
    pha_portion,
    tenant_portion,
    description,
    move_in_date,
    lease_start_date,
    lease_end_date,
    unit_amenities
  )
  VALUES (
    COALESCE(p_unit_id, gen_random_uuid()),
    p_property_id,
    (p_unit_data->>'unit_number')::text,
    (p_unit_data->>'unit_name')::text,
    (p_unit_data->>'bedrooms')::integer,
    (p_unit_data->>'bathrooms')::numeric,
    (p_unit_data->>'square_feet')::integer,
    (p_unit_data->>'monthly_rent')::numeric,
    (p_unit_data->>'security_deposit_amount')::numeric,
    COALESCE((p_unit_data->>'status')::text, 'vacant'),
    (p_unit_data->>'tenant_type')::text,
    COALESCE((p_unit_data->>'has_voucher')::boolean, false),
    (p_unit_data->>'pha_portion')::numeric,
    (p_unit_data->>'tenant_portion')::numeric,
    (p_unit_data->>'description')::text,
    (p_unit_data->>'move_in_date')::date,
    (p_unit_data->>'lease_start_date')::date,
    (p_unit_data->>'lease_end_date')::date,
    CASE 
      WHEN p_unit_data->'amenities' IS NOT NULL 
      THEN ARRAY(SELECT jsonb_array_elements_text(p_unit_data->'amenities'))
      ELSE ARRAY[]::text[]
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    unit_number = EXCLUDED.unit_number,
    unit_name = EXCLUDED.unit_name,
    bedrooms = EXCLUDED.bedrooms,
    bathrooms = EXCLUDED.bathrooms,
    square_feet = EXCLUDED.square_feet,
    monthly_rent = EXCLUDED.monthly_rent,
    security_deposit_amount = EXCLUDED.security_deposit_amount,
    status = EXCLUDED.status,
    tenant_type = EXCLUDED.tenant_type,
    has_voucher = EXCLUDED.has_voucher,
    pha_portion = EXCLUDED.pha_portion,
    tenant_portion = EXCLUDED.tenant_portion,
    description = EXCLUDED.description,
    move_in_date = EXCLUDED.move_in_date,
    lease_start_date = EXCLUDED.lease_start_date,
    lease_end_date = EXCLUDED.lease_end_date,
    unit_amenities = EXCLUDED.unit_amenities,
    updated_at = now()
  RETURNING id INTO v_unit_id;

  -- Log to security_audit_logs (the table that actually exists)
  INSERT INTO public.security_audit_logs (
    user_id,
    event_type,
    metadata,
    severity
  )
  VALUES (
    auth.uid(),
    'admin_unit_' || v_action_type,
    jsonb_build_object(
      'target_type', 'unit',
      'target_id', v_unit_id,
      'property_id', p_property_id,
      'changes', v_changes,
      'reason', p_reason,
      'additional_metadata', p_metadata
    ),
    'info'
  );

  RETURN v_unit_id;
END;
$$;