-- Drop all specific overloads of admin_upsert_unit function
DROP FUNCTION IF EXISTS public.admin_upsert_unit(uuid, jsonb, uuid, text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.admin_upsert_unit(uuid, uuid, jsonb, text, jsonb) CASCADE;

-- Recreate the function with correct signature and column mappings
CREATE OR REPLACE FUNCTION public.admin_upsert_unit(
  p_property_id uuid,
  p_unit_data jsonb,
  p_unit_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'Unit management operation',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_unit_id uuid;
  v_result jsonb;
  v_amenities text[];
BEGIN
  -- Security check: only admins can manage units
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Parse amenities from JSON string to array if present
  IF p_unit_data ? 'amenities' THEN
    BEGIN
      v_amenities := ARRAY(
        SELECT jsonb_array_elements_text(p_unit_data->'amenities')
      );
    EXCEPTION WHEN OTHERS THEN
      v_amenities := ARRAY[]::text[];
    END;
  ELSE
    v_amenities := ARRAY[]::text[];
  END IF;

  -- Insert or update unit
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
    lease_start_date,
    lease_end_date,
    move_in_date,
    description,
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
    (p_unit_data->>'lease_start_date')::date,
    (p_unit_data->>'lease_end_date')::date,
    (p_unit_data->>'move_in_date')::date,
    (p_unit_data->>'description')::text,
    v_amenities
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
    lease_start_date = EXCLUDED.lease_start_date,
    lease_end_date = EXCLUDED.lease_end_date,
    move_in_date = EXCLUDED.move_in_date,
    description = EXCLUDED.description,
    unit_amenities = EXCLUDED.unit_amenities,
    updated_at = now()
  RETURNING id INTO v_unit_id;

  -- Log the action to admin audit log
  INSERT INTO public.admin_audit_log (
    admin_id,
    action,
    entity_type,
    entity_id,
    reason,
    metadata
  ) VALUES (
    auth.uid(),
    CASE WHEN p_unit_id IS NULL THEN 'unit_created' ELSE 'unit_updated' END,
    'unit',
    v_unit_id,
    p_reason,
    p_metadata
  );

  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'unit_id', v_unit_id
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users (function checks admin status internally)
GRANT EXECUTE ON FUNCTION public.admin_upsert_unit TO authenticated;