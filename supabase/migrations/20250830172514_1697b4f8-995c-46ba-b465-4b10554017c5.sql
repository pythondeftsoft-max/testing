
-- Phase 4: Admin Applications Oversight

-- 1) Admin: list property applications with optional filters
create or replace function public.admin_list_property_applications(
  p_property_id uuid,
  p_status text default 'all',
  p_search text default null
)
returns table (
  id uuid,
  property_id uuid,
  unit_id uuid,
  tenant_id uuid,
  status text,
  priority_payment_made boolean,
  priority_payment_amount numeric,
  created_at timestamptz,
  updated_at timestamptz,
  tenant_first_name text,
  tenant_last_name text,
  tenant_phone text,
  unit_number text,
  unit_name text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'Not authorized';
  end if;

  return query
  select
    pa.id,
    pa.property_id,
    pa.unit_id,
    pa.tenant_id,
    pa.status,
    pa.priority_payment_made,
    pa.priority_payment_amount,
    pa.created_at,
    pa.updated_at,
    pr.first_name as tenant_first_name,
    pr.last_name  as tenant_last_name,
    pr.phone      as tenant_phone,
    u.unit_number,
    u.unit_name
  from property_applications pa
  left join profiles pr on pr.id = pa.tenant_id
  left join property_units u on u.id = pa.unit_id
  where pa.property_id = p_property_id
    and (p_status = 'all' or pa.status = p_status)
    and (
      p_search is null
      or p_search = ''
      or (coalesce(pr.first_name, '') || ' ' || coalesce(pr.last_name, '')) ilike '%' || p_search || '%'
      or coalesce(u.unit_number, '') ilike '%' || p_search || '%'
    )
  order by pa.priority_payment_made desc, pa.created_at desc;
end;
$$;

revoke all on function public.admin_list_property_applications(uuid, text, text) from public;

-- 2) Admin: update a single application status
create or replace function public.admin_update_application_status(
  p_application_id uuid,
  p_new_status text,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
begin
  if not is_admin(v_admin_id) then
    raise exception 'Not authorized';
  end if;

  update property_applications
     set status = p_new_status,
         updated_at = now()
   where id = p_application_id;

  insert into admin_action_logs (action, admin_user_id, resource_type, resource_id, reason, details)
  values (
    'application_status_update',
    v_admin_id,
    'property_application',
    p_application_id::text,
    p_reason,
    jsonb_build_object(
      'new_status', p_new_status,
      'metadata', coalesce(p_metadata, '{}'::jsonb)
    )
  );
end;
$$;

revoke all on function public.admin_update_application_status(uuid, text, text, jsonb) from public;

-- 3) Admin: bulk update application statuses
create or replace function public.admin_bulk_update_application_status(
  p_application_ids uuid[],
  p_new_status text,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_updated_count integer := 0;
begin
  if not is_admin(v_admin_id) then
    raise exception 'Not authorized';
  end if;

  update property_applications
     set status = p_new_status,
         updated_at = now()
   where id = any(p_application_ids);

  get diagnostics v_updated_count = row_count;

  insert into admin_action_logs (action, admin_user_id, resource_type, resource_id, reason, details)
  values (
    'application_status_bulk_update',
    v_admin_id,
    'property_application',
    null,
    p_reason,
    jsonb_build_object(
      'new_status', p_new_status,
      'application_ids', p_application_ids,
      'updated_count', v_updated_count,
      'metadata', coalesce(p_metadata, '{}'::jsonb)
    )
  );

  return v_updated_count;
end;
$$;

revoke all on function public.admin_bulk_update_application_status(uuid[], text, text, jsonb) from public;

-- 4) Admin: reassign application to a different unit (must be same property)
create or replace function public.admin_reassign_application_unit(
  p_application_id uuid,
  p_target_unit_id uuid,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_app record;
  v_target_property_id uuid;
begin
  if not is_admin(v_admin_id) then
    raise exception 'Not authorized';
  end if;

  select * into v_app
  from property_applications
  where id = p_application_id;

  if v_app is null then
    raise exception 'Application not found';
  end if;

  select property_id into v_target_property_id
  from property_units
  where id = p_target_unit_id;

  if v_target_property_id is null then
    raise exception 'Target unit not found';
  end if;

  if v_target_property_id <> v_app.property_id then
    raise exception 'Target unit belongs to a different property';
  end if;

  update property_applications
     set unit_id = p_target_unit_id,
         updated_at = now()
   where id = p_application_id;

  insert into admin_action_logs (action, admin_user_id, resource_type, resource_id, reason, details)
  values (
    'application_reassign_unit',
    v_admin_id,
    'property_application',
    p_application_id::text,
    p_reason,
    jsonb_build_object(
      'old_unit_id', v_app.unit_id,
      'new_unit_id', p_target_unit_id,
      'metadata', coalesce(p_metadata, '{}'::jsonb)
    )
  );
end;
$$;

revoke all on function public.admin_reassign_application_unit(uuid, uuid, text, jsonb) from public;

-- 5) Helpful index for filtering
create index if not exists idx_property_applications_property_status_created_at
  on public.property_applications(property_id, status, created_at);
