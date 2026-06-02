
-- 0) Create audit table (if missing) and RLS
create table if not exists public.points_admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles(id),
  target_user_id uuid not null references public.profiles(id),
  adjustment_type text not null, -- add | subtract | set | delegate_in | delegate_out
  points_change numeric not null,
  reason text not null,
  notes text,
  related_entity_id uuid,
  related_entity_type text,
  created_at timestamptz not null default now()
);

alter table public.points_admin_audit enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'points_admin_audit'
      and polname = 'Admins can manage points admin audit'
  ) then
    create policy "Admins can manage points admin audit"
      on public.points_admin_audit
      for all
      using (is_admin(auth.uid()))
      with check (is_admin(auth.uid()));
  end if;
end;
$$;

-- 1) Fix search_admin_users: compute total_points from points_history latest balance
drop function if exists public.search_admin_users(text, text, text, integer, integer);

create or replace function public.search_admin_users(
  search_query   text default null,
  type_filter    text default null,
  status_filter  text default null,
  limit_count    integer default 50,
  offset_count   integer default 0
)
returns table(
  id               uuid,
  first_name       text,
  last_name        text,
  email            text,
  user_type        text,
  account_status   text,
  total_points     integer,
  last_sign_in_at  timestamptz,
  created_at       timestamptz,
  updated_at       timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  with latest_balance as (
    select distinct on (ph.user_id)
      ph.user_id,
      coalesce(ph.points_balance_after, 0) as balance
    from public.points_history ph
    order by ph.user_id, ph.timestamp desc
  )
  select
    p.id,
    p.first_name,
    p.last_name,
    au.email,
    p.user_type::text as user_type,
    case 
      when au.email_confirmed_at is not null then 'active'
      when au.email_confirmed_at is null then 'invited'
      else 'suspended'
    end::text as account_status,
    coalesce(lb.balance, 0)::integer as total_points,
    au.last_sign_in_at,
    p.created_at,
    p.updated_at
  from public.profiles p
  join auth.users au on au.id = p.id
  left join latest_balance lb on lb.user_id = p.id
  where
    (search_query is null or
     p.first_name ilike '%' || search_query || '%' or
     p.last_name  ilike '%' || search_query || '%' or
     au.email     ilike '%' || search_query || '%')
    and (type_filter is null or p.user_type::text = type_filter)
    and (
      status_filter is null
      or (status_filter = 'active'   and au.email_confirmed_at is not null)
      or (status_filter = 'invited'  and au.email_confirmed_at is null)
      or (status_filter = 'suspended' and au.email_confirmed_at is null)
    )
  order by p.created_at desc
  limit limit_count
  offset offset_count;
end;
$$;

-- 2) Fix get_points_recent_activity_admin to rely on points_history (table exists)
drop function if exists public.get_points_recent_activity_admin(integer);

create or replace function public.get_points_recent_activity_admin(
  activity_limit integer default 20
)
returns table(
  id            uuid,
  user_id       uuid,
  event_type    text,
  points_change integer,
  notes         text,
  created_at    timestamptz,
  user_name     text,
  user_email    text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    ph.id,
    ph.user_id,
    ph.event_type,
    coalesce(ph.points_change, 0)::integer as points_change,
    ph.notes,
    ph.timestamp as created_at,
    concat(pr.first_name, ' ', pr.last_name) as user_name,
    au.email as user_email
  from public.points_history ph
  join public.profiles pr on pr.id = ph.user_id
  join auth.users au on au.id = ph.user_id
  order by ph.timestamp desc
  limit activity_limit;
end;
$$;

-- 3) Fix admin_adjust_user_points to use award_points + points_history and match frontend types
drop function if exists public.admin_adjust_user_points(uuid, text, integer, text, text);
drop function if exists public.admin_adjust_user_points(uuid, text, numeric, text, text);

create or replace function public.admin_adjust_user_points(
  p_target_user_id uuid,
  p_adjustment_type text, -- 'add' | 'subtract' | 'set'
  p_points numeric,
  p_reason text,
  p_notes text default null
)
returns table(
  success boolean,
  new_balance numeric,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
  v_current_balance numeric := 0;
  v_final_delta numeric := 0;
  v_success boolean;
  v_new_balance numeric;
  v_points_awarded numeric;
begin
  v_admin := auth.uid();
  if not is_admin(v_admin) then
    return query select false, 0::numeric, 'Unauthorized: Admin access required'::text;
    return;
  end if;

  if p_adjustment_type = 'add' then
    v_final_delta := abs(p_points);
  elsif p_adjustment_type = 'subtract' then
    v_final_delta := -abs(p_points);
  elsif p_adjustment_type = 'set' then
    select coalesce(points_balance_after, 0)
      into v_current_balance
    from public.points_history
    where user_id = p_target_user_id
    order by timestamp desc
    limit 1;

    v_final_delta := coalesce(p_points, 0) - coalesce(v_current_balance, 0);
  else
    return query select false, 0::numeric, 'Invalid adjustment type'::text;
    return;
  end if;

  select ap.success, ap.new_balance, ap.points_awarded
    into v_success, v_new_balance, v_points_awarded
  from public.award_points(
    p_target_user_id,
    'admin_adjustment',
    v_final_delta,
    coalesce(p_notes, 'Admin adjustment: ' || p_reason),
    null,
    null,
    v_admin
  ) as ap;

  insert into public.points_admin_audit (
    admin_user_id, target_user_id, adjustment_type, points_change, reason, notes
  ) values (
    v_admin, p_target_user_id, p_adjustment_type, v_final_delta, p_reason, p_notes
  );

  return query
  select true, v_new_balance, 'Points adjusted successfully'::text;
end;
$$;

-- 4) Fix admin_delegate_points to use award_points and match frontend types
drop function if exists public.admin_delegate_points(uuid, uuid, integer, text, text);
drop function if exists public.admin_delegate_points(uuid, uuid, numeric, text, text);

create or replace function public.admin_delegate_points(
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_points numeric,
  p_reason text,
  p_notes text default null
)
returns table(
  success boolean,
  from_new_balance numeric,
  to_new_balance numeric,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin uuid;
  v_points numeric := abs(p_points);
  v_from_balance numeric := 0;
  v_out_success boolean;
  v_out_new_balance numeric;
  v_out_points_awarded numeric;
  v_in_success boolean;
  v_in_new_balance numeric;
  v_in_points_awarded numeric;
begin
  v_admin := auth.uid();
  if not is_admin(v_admin) then
    return query select false, 0::numeric, 0::numeric, 'Unauthorized: Admin access required'::text;
    return;
  end if;

  select coalesce(points_balance_after, 0)
    into v_from_balance
  from public.points_history
  where user_id = p_from_user_id
  order by timestamp desc
  limit 1;

  if v_from_balance < v_points then
    return query select false, v_from_balance, v_from_balance, 'Insufficient points to delegate'::text;
    return;
  end if;

  -- Delegate out
  select ap.success, ap.new_balance, ap.points_awarded
    into v_out_success, v_out_new_balance, v_out_points_awarded
  from public.award_points(
    p_from_user_id,
    'admin_delegation_out',
    -v_points,
    coalesce(p_notes, 'Delegated to ' || p_to_user_id || ': ' || p_reason),
    p_to_user_id,
    'user',
    v_admin
  ) as ap;

  -- Delegate in
  select ap.success, ap.new_balance, ap.points_awarded
    into v_in_success, v_in_new_balance, v_in_points_awarded
  from public.award_points(
    p_to_user_id,
    'admin_delegation_in',
    v_points,
    coalesce(p_notes, 'Delegated from ' || p_from_user_id || ': ' || p_reason),
    p_from_user_id,
    'user',
    v_admin
  ) as ap;

  insert into public.points_admin_audit (
    admin_user_id, target_user_id, adjustment_type, points_change, reason, notes, related_entity_id, related_entity_type
  ) values
    (v_admin, p_from_user_id, 'delegate_out', -v_points, p_reason, p_notes, p_to_user_id, 'user'),
    (v_admin, p_to_user_id, 'delegate_in',  v_points, p_reason, p_notes, p_from_user_id, 'user');

  return query
  select true, v_out_new_balance, v_in_new_balance, 'Points delegated successfully'::text;
end;
$$;
