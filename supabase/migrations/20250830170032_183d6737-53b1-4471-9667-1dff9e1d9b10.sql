
-- Phase 3: Admin unit management RPCs

-- 1) Admin can fetch all units for a property (bypassing RLS, with guard)
create or replace function public.admin_get_property_units(p_property_id uuid)
returns setof public.property_units
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not is_admin(auth.uid()) then
    raise exception 'Only admins can access units';
  end if;

  return query
  select *
  from public.property_units
  where property_id = p_property_id
  order by unit_number;
end;
$function$;

-- 2) Admin can set a unit's on_market flag with audit log
create or replace function public.admin_set_unit_market_status(
  p_unit_id uuid,
  p_on_market boolean,
  p_reason text default 'Admin override via dashboard',
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_property_id uuid;
begin
  if not is_admin(auth.uid()) then
    raise exception 'Only admins can set unit market status';
  end if;

  select property_id into v_property_id
  from public.property_units
  where id = p_unit_id;

  update public.property_units
  set on_market = p_on_market,
      updated_at = now()
  where id = p_unit_id;

  if not found then
    raise exception 'Unit not found';
  end if;

  insert into public.admin_action_logs (
    admin_user_id, action, resource_type, resource_id, reason, details
  ) values (
    auth.uid(),
    case when p_on_market then 'set_unit_on_market' else 'set_unit_off_market' end,
    'unit',
    p_unit_id,
    p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return true;
end;
$function$;

-- 3) Admin can remove tenant from a unit (and cancel approved apps) with audit log
create or replace function public.admin_remove_unit_tenant(
  p_unit_id uuid,
  p_reason text default 'Admin tenant removal via dashboard',
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_property_id uuid;
begin
  if not is_admin(auth.uid()) then
    raise exception 'Only admins can remove unit tenants';
  end if;

  -- Identify property for related cleanups/logging if needed
  select property_id into v_property_id
  from public.property_units
  where id = p_unit_id;

  -- Clear tenant and make unit available
  update public.property_units
  set tenant_id = null,
      status = 'available',
      updated_at = now()
  where id = p_unit_id;

  if not found then
    raise exception 'Unit not found';
  end if;

  -- Cancel any 'approved' applications for this unit
  update public.property_applications
  set status = 'cancelled',
      updated_at = now()
  where unit_id = p_unit_id
    and status = 'approved';

  -- Audit log
  insert into public.admin_action_logs (
    admin_user_id, action, resource_type, resource_id, reason, details
  ) values (
    auth.uid(),
    'remove_unit_tenant',
    'unit',
    p_unit_id,
    p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return true;
end;
$function$;

-- 4) Admin upsert (create/update) a unit with flexible payload and audit log
--    Pass null p_unit_id to insert, non-null to update.
--    p_unit_data can include: unit_number, unit_type, bedrooms, bathrooms,
--    square_feet, monthly_rent, deposit_amount, pet_friendly, parking_spots,
--    amenities, lease_terms, availability_date, notes, status
create or replace function public.admin_upsert_unit(
  p_unit_id uuid,
  p_property_id uuid,
  p_unit_data jsonb,
  p_reason text default 'Admin unit upsert via dashboard',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_unit_id uuid;
  v_action text;
begin
  if not is_admin(auth.uid()) then
    raise exception 'Only admins can upsert units';
  end if;

  if p_unit_id is null then
    -- Insert
    insert into public.property_units (
      property_id,
      unit_number,
      unit_type,
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
      nullif(p_unit_data->>'unit_type',''),
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
      unit_type         = coalesce(nullif(p_unit_data->>'unit_type',''), unit_type),
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

    if not found then
      raise exception 'Unit not found';
    end if;

    v_action := 'update_unit';
  end if;

  insert into public.admin_action_logs (
    admin_user_id, action, resource_type, resource_id, reason, details
  ) values (
    auth.uid(),
    v_action,
    'unit',
    v_unit_id,
    p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  );

  return v_unit_id;
end;
$function$;

-- 5) Helpful index to keep operations snappy (idempotent)
create index if not exists idx_property_units_property_unitnumber
on public.property_units (property_id, unit_number);
