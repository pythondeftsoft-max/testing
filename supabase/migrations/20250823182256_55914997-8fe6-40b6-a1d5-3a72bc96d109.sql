
-- 1) Admin-only: list all portfolios with their roles
create or replace function public.get_all_portfolios_with_roles()
returns table(
  portfolio_id uuid,
  portfolio_name text,
  owner_id uuid,
  owner_name text,
  owner_email text,
  created_at timestamptz,
  property_count integer,
  role_count integer,
  roles jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only platform admins can call
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

  return query
  select
    p.id as portfolio_id,
    p.name as portfolio_name,
    p.owner_id,
    coalesce(o.first_name || ' ' || o.last_name, 'Unknown') as owner_name,
    au.email as owner_email,
    p.created_at,
    coalesce((
      select count(*) from public.properties prop
      where prop.portfolio_id = p.id
        and prop.deleted_at is null
        and prop.status <> 'deleted'
    ),0) as property_count,
    coalesce((
      select count(*) from public.portfolio_roles prr
      where prr.portfolio_id = p.id
        and prr.is_active = true
    ),0) as role_count,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'portfolio_role_id', prr.id,
          'user_id', prr.user_id,
          'user_name', up.first_name || ' ' || up.last_name,
          'user_email', u.email,
          'role_name', prr.role_name,
          'is_active', prr.is_active,
          'added_by', prr.added_by,
          'updated_at', prr.updated_at
        )
        order by prr.updated_at desc
      )
      from public.portfolio_roles prr
      left join public.profiles up on up.id = prr.user_id
      left join auth.users u on u.id = prr.user_id
      where prr.portfolio_id = p.id
    ), '[]'::jsonb) as roles
  from public.portfolios p
  left join public.profiles o on o.id = p.owner_id
  left join auth.users au on au.id = p.owner_id
  order by p.created_at desc;
end;
$$;

-- 2) Admin-only: grant account role
create or replace function public.admin_grant_account_role(
  p_target_user_id uuid,
  p_role public.account_role_type,
  p_notes text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_existing_id uuid;
begin
  if not public.is_admin(v_caller) then
    raise exception 'forbidden';
  end if;

  -- If same active role exists, do nothing
  select id into v_existing_id
  from public.account_roles
  where user_id = p_target_user_id
    and role_name = p_role
    and is_active = true
  limit 1;

  if v_existing_id is not null then
    perform public.log_rbac_event(
      p_action => 'grant',
      p_scope => 'account',
      p_object => 'role',
      p_allowed => false,
      p_metadata => jsonb_build_object('reason','already_active','role',p_role,'target_user_id',p_target_user_id)
    );
    return false;
  end if;

  insert into public.account_roles (user_id, role_name, notes, added_by, is_active, created_at, updated_at)
  values (p_target_user_id, p_role, p_notes, v_caller, true, now(), now());

  perform public.log_rbac_event(
    p_action => 'grant',
    p_scope => 'account',
    p_object => 'role',
    p_allowed => true,
    p_metadata => jsonb_build_object('role',p_role,'target_user_id',p_target_user_id)
  );

  return true;
end;
$$;

-- 3) Admin-only: revoke account role
create or replace function public.admin_revoke_account_role(
  p_account_role_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

  update public.account_roles
  set is_active = false,
      updated_at = now()
  where id = p_account_role_id
    and is_active = true;

  perform public.log_rbac_event(
    p_action => 'revoke',
    p_scope => 'account',
    p_object => 'role',
    p_allowed => true,
    p_metadata => jsonb_build_object('account_role_id',p_account_role_id)
  );

  return true;
end;
$$;

-- 4) Admin-only: grant portfolio role
create or replace function public.admin_grant_portfolio_role(
  p_portfolio_id uuid,
  p_target_user_id uuid,
  p_role public.portfolio_role_type
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_id uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

  select id into v_existing_id
  from public.portfolio_roles
  where portfolio_id = p_portfolio_id
    and user_id = p_target_user_id
    and role_name = p_role
    and is_active = true
  limit 1;

  if v_existing_id is not null then
    perform public.log_rbac_event(
      p_action => 'grant',
      p_scope => 'portfolio',
      p_object => 'role',
      p_allowed => false,
      p_portfolio_id => p_portfolio_id,
      p_metadata => jsonb_build_object('reason','already_active','role',p_role,'target_user_id',p_target_user_id)
    );
    return false;
  end if;

  insert into public.portfolio_roles (portfolio_id, user_id, role_name, added_by, permissions_level, is_active, created_at, updated_at)
  values (p_portfolio_id, p_target_user_id, p_role, auth.uid(),
          case when p_role = 'admin_partner' then 5 when p_role = 'editor' then 3 when p_role = 'viewer' then 1 else 2 end,
          true, now(), now());

  perform public.log_rbac_event(
    p_action => 'grant',
    p_scope => 'portfolio',
    p_object => 'role',
    p_allowed => true,
    p_portfolio_id => p_portfolio_id,
    p_metadata => jsonb_build_object('role',p_role,'target_user_id',p_target_user_id)
  );

  return true;
end;
$$;

-- 5) Admin-only: revoke portfolio role
create or replace function public.admin_revoke_portfolio_role(
  p_portfolio_role_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_portfolio_id uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

  select portfolio_id into v_portfolio_id
  from public.portfolio_roles
  where id = p_portfolio_role_id;

  update public.portfolio_roles
  set is_active = false,
      updated_at = now()
  where id = p_portfolio_role_id
    and is_active = true;

  perform public.log_rbac_event(
    p_action => 'revoke',
    p_scope => 'portfolio',
    p_object => 'role',
    p_allowed => true,
    p_portfolio_id => v_portfolio_id,
    p_metadata => jsonb_build_object('portfolio_role_id',p_portfolio_role_id)
  );

  return true;
end;
$$;

-- 6) Admin-only: update account role permission matrix (JSON array input)
-- Expected JSON element shape: 
--   { "object_name": "admin.role_management", "can_view": true, "can_edit": true, "can_delete": false, "can_create": true }
create or replace function public.admin_update_account_role_permissions(
  p_role public.account_role_type,
  p_permissions jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_obj record;
  v_perm_id uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

  for v_obj in
    select (elem->>'object_name')::text as object_name,
           coalesce((elem->>'can_view')::boolean, false) as can_view,
           coalesce((elem->>'can_edit')::boolean, false) as can_edit,
           coalesce((elem->>'can_delete')::boolean, false) as can_delete,
           coalesce((elem->>'can_create')::boolean, false) as can_create
    from jsonb_array_elements(p_permissions) elem
  loop
    select id into v_perm_id
    from public.permission_objects
    where name = v_obj.object_name and scope = 'account'
    limit 1;

    if v_perm_id is not null then
      insert into public.account_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create, created_at)
      values (p_role, v_perm_id, v_obj.can_view, v_obj.can_edit, v_obj.can_delete, v_obj.can_create, now())
      on conflict (role_name, permission_object_id)
      do update set can_view = excluded.can_view,
                    can_edit = excluded.can_edit,
                    can_delete = excluded.can_delete,
                    can_create = excluded.can_create,
                    created_at = least(public.account_role_permissions.created_at, now()),
                    updated_at = now();
      v_count := v_count + 1;
    end if;
  end loop;

  perform public.log_rbac_event(
    p_action => 'update_permissions',
    p_scope => 'account',
    p_object => 'role_matrix',
    p_allowed => true,
    p_metadata => jsonb_build_object('role', p_role, 'updated', v_count)
  );

  return v_count;
end;
$$;

-- 7) Admin-only: update portfolio role permission matrix (JSON array input)
-- Same JSON shape as above, but scope='portfolio'
create or replace function public.admin_update_portfolio_role_permissions(
  p_role public.portfolio_role_type,
  p_permissions jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_obj record;
  v_perm_id uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'forbidden';
  end if;

  for v_obj in
    select (elem->>'object_name')::text as object_name,
           coalesce((elem->>'can_view')::boolean, false) as can_view,
           coalesce((elem->>'can_edit')::boolean, false) as can_edit,
           coalesce((elem->>'can_delete')::boolean, false) as can_delete,
           coalesce((elem->>'can_create')::boolean, false) as can_create
    from jsonb_array_elements(p_permissions) elem
  loop
    select id into v_perm_id
    from public.permission_objects
    where name = v_obj.object_name and scope = 'portfolio'
    limit 1;

    if v_perm_id is not null then
      insert into public.portfolio_role_permissions (role_name, permission_object_id, can_view, can_edit, can_delete, can_create, created_at)
      values (p_role, v_perm_id, v_obj.can_view, v_obj.can_edit, v_obj.can_delete, v_obj.can_create, now())
      on conflict (role_name, permission_object_id)
      do update set can_view = excluded.can_view,
                    can_edit = excluded.can_edit,
                    can_delete = excluded.can_delete,
                    can_create = excluded.can_create,
                    created_at = least(public.portfolio_role_permissions.created_at, now()),
                    updated_at = now();
      v_count := v_count + 1;
    end if;
  end loop;

  perform public.log_rbac_event(
    p_action => 'update_permissions',
    p_scope => 'portfolio',
    p_object => 'role_matrix',
    p_allowed => true,
    p_metadata => jsonb_build_object('role', p_role, 'updated', v_count)
  );

  return v_count;
end;
$$;
