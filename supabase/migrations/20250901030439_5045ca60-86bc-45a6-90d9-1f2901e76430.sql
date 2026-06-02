
-- 1) Fix: Admin portfolios overview RPC (uses manager_id instead of owner_id)
create or replace function public.get_all_portfolios_with_roles()
returns table (
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
set search_path to public
as $$
begin
  -- Admin/Owner guard
  if not (public.is_admin(auth.uid()) 
          or public.has_account_role(auth.uid(), array['owner'::account_role_type, 'admin_partner'::account_role_type])) then
    raise exception 'not authorized';
  end if;

  return query
  with role_data as (
    select
      pr.portfolio_id,
      jsonb_agg(
        jsonb_build_object(
          'portfolio_role_id', pr.id,
          'user_id', pr.user_id,
          'user_name', coalesce(pp.first_name || ' ' || pp.last_name, pp.company_name, au.email),
          'user_email', au.email,
          'role_name', pr.role_name,
          'is_active', pr.is_active,
          'added_by', pr.added_by,
          'updated_at', pr.updated_at
        )
        order by pr.updated_at desc
      ) filter (where pr.id is not null) as roles,
      count(*) filter (where pr.is_active) as active_role_count
    from public.portfolio_roles pr
    left join public.profiles pp on pp.id = pr.user_id
    left join auth.users au on au.id = pr.user_id
    group by pr.portfolio_id
  ),
  property_counts as (
    select p.portfolio_id, count(*)::int as cnt
    from public.properties p
    where p.deleted_at is null and p.status != 'deleted'
    group by p.portfolio_id
  )
  select 
    p.id as portfolio_id,
    p.client_name as portfolio_name,
    p.manager_id as owner_id,
    coalesce(owner.first_name || ' ' || owner.last_name, owner.company_name, owner_user.email) as owner_name,
    owner_user.email as owner_email,
    p.created_at,
    coalesce(pc.cnt, 0) as property_count,
    coalesce(rd.active_role_count, 0) as role_count,
    coalesce(rd.roles, '[]'::jsonb) as roles
  from public.portfolios p
  left join public.profiles owner on owner.id = p.manager_id
  left join auth.users owner_user on owner_user.id = p.manager_id
  left join property_counts pc on pc.portfolio_id = p.id
  left join role_data rd on rd.portfolio_id = p.id
  order by p.created_at desc;
end;
$$;

-- 2) Fix: Admin account roles list RPC (alias added_by -> granted_by)
create or replace function public.get_all_account_roles_with_emails()
returns table (
  user_id uuid,
  user_name text,
  user_email text,
  role_name account_role_type,
  is_active boolean,
  notes text,
  granted_at timestamptz,
  granted_by uuid
)
language plpgsql
security definer
set search_path to public, auth
as $$
begin
  -- Admin/Owner guard
  if not (public.is_admin(auth.uid()) 
          or public.has_account_role(auth.uid(), array['owner'::account_role_type, 'admin_partner'::account_role_type])) then
    raise exception 'not authorized';
  end if;

  return query
  select 
    ar.user_id,
    coalesce(p.first_name || ' ' || p.last_name, p.company_name, au.email) as user_name,
    au.email as user_email,
    ar.role_name,
    ar.is_active,
    ar.notes,
    ar.created_at as granted_at,
    ar.added_by as granted_by
  from public.account_roles ar
  left join public.profiles p on p.id = ar.user_id
  left join auth.users au on au.id = ar.user_id
  order by ar.created_at desc;
end;
$$;

-- 3) Helpful indexes for performance
create index if not exists idx_portfolios_manager_id on public.portfolios (manager_id);
create index if not exists idx_portfolio_roles_portfolio_active on public.portfolio_roles (portfolio_id, is_active);
create index if not exists idx_properties_portfolio_id on public.properties (portfolio_id);
