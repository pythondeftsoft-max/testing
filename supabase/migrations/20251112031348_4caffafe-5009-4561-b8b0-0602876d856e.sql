-- Fix admin_upsert_unit function by removing non-existent unit_type column references

CREATE OR REPLACE FUNCTION public.admin_upsert_unit(
  p_property_id uuid,
  p_unit_data jsonb,
  p_unit_id uuid default null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_unit_id uuid;
  v_action text;
BEGIN
  -- Check if user is admin
  if not public.is_admin(auth.uid()) then
    raise exception 'Only admins can upsert units';
  end if;

  if p_unit_id is null then
    -- Insert
    insert into public.property_units (
      property_id,
      unit_number,
      bedrooms,
      bathrooms,
      square_feet,
      monthly_rent,
      deposit_amount,
      pet_friendly,
      parking_spots,
      amenities,
      lease_terms,
      availability_date,
      notes,
      status,
      on_market,
      created_at,
      updated_at
    ) values (
      p_property_id,
      nullif(p_unit_data->>'unit_number',''),
      nullif(p_unit_data->>'bedrooms','')::int,
      nullif(p_unit_data->>'bathrooms','')::numeric,
      nullif(p_unit_data->>'square_feet','')::int,
      nullif(p_unit_data->>'monthly_rent','')::numeric,
      nullif(p_unit_data->>'deposit_amount','')::numeric,
      coalesce((p_unit_data->>'pet_friendly')::boolean, false),
      nullif(p_unit_data->>'parking_spots','')::int,
      nullif(p_unit_data->>'amenities',''),
      nullif(p_unit_data->>'lease_terms',''),
      nullif(p_unit_data->>'availability_date','')::date,
      nullif(p_unit_data->>'notes',''),
      coalesce(nullif(p_unit_data->>'status',''), 'available'),
      coalesce((p_unit_data->>'on_market')::boolean, true),
      now(),
      now()
    )
    returning id into v_unit_id;

    v_action := 'create_unit';
  else
    -- Update
    update public.property_units
    set
      unit_number       = coalesce(nullif(p_unit_data->>'unit_number',''), unit_number),
      bedrooms          = coalesce(nullif(p_unit_data->>'bedrooms','')::int, bedrooms),
      bathrooms         = coalesce(nullif(p_unit_data->>'bathrooms','')::numeric, bathrooms),
      square_feet       = coalesce(nullif(p_unit_data->>'square_feet','')::int, square_feet),
      monthly_rent      = coalesce(nullif(p_unit_data->>'monthly_rent','')::numeric, monthly_rent),
      deposit_amount    = coalesce(nullif(p_unit_data->>'deposit_amount','')::numeric, deposit_amount),
      pet_friendly      = coalesce((p_unit_data->>'pet_friendly')::boolean, pet_friendly),
      parking_spots     = coalesce(nullif(p_unit_data->>'parking_spots','')::int, parking_spots),
      amenities         = coalesce(nullif(p_unit_data->>'amenities',''), amenities),
      lease_terms       = coalesce(nullif(p_unit_data->>'lease_terms',''), lease_terms),
      availability_date = coalesce(nullif(p_unit_data->>'availability_date','')::date, availability_date),
      notes             = coalesce(nullif(p_unit_data->>'notes',''), notes),
      status            = coalesce(nullif(p_unit_data->>'status',''), status),
      on_market         = coalesce((p_unit_data->>'on_market')::boolean, on_market),
      updated_at        = now()
    where id = p_unit_id
    returning id into v_unit_id;

    v_action := 'update_unit';
  end if;

  -- Log the action
  insert into public.security_audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) values (
    auth.uid(),
    v_action,
    'property_unit',
    v_unit_id,
    jsonb_build_object(
      'property_id', p_property_id,
      'unit_data', p_unit_data,
      'admin_action', true
    )
  );

  return v_unit_id;
END;
$$;