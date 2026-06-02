
-- Phase 1: Security, correctness, and backend utilities for points management

-- 1) BEFORE INSERT trigger to ensure points_balance_after is always computed
create or replace function public.set_points_balance_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_balance numeric := 0;
begin
  if new.timestamp is null then
    new.timestamp := now();
  end if;

  if new.points_balance_after is null or new.points_balance_after <= 0 then
    select coalesce(ph.points_balance_after, 0)
      into v_current_balance
    from public.points_history ph
    where ph.user_id = new.user_id
    order by ph.timestamp desc
    limit 1;

    new.points_balance_after := v_current_balance + coalesce(new.points_change, 0);
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'set_points_balance_before_insert'
  ) then
    create trigger set_points_balance_before_insert
      before insert on public.points_history
      for each row
      execute function public.set_points_balance_before_insert();
  end if;
end;
$$;

-- 2) Tighten RLS on points_history (replace overly-permissive insert policy)
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'points_history'
      and polname = 'System can insert points history'
  ) then
    execute 'drop policy "System can insert points history" on public.points_history';
  end if;
end;
$$;

-- Allow service role to insert (edge functions)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'points_history'
      and polname = 'Service can insert points history'
  ) then
    create policy "Service can insert points history"
      on public.points_history
      for insert
      using (true)
      with check (current_setting('role', true) = 'service_role');
  end if;
end;
$$;

-- Allow normal users to insert only their own rows (and processed_by must match)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'points_history'
      and polname = 'Users can insert their own points history'
  ) then
    create policy "Users can insert their own points history"
      on public.points_history
      for insert
      with check (
        user_id = auth.uid()
        and (processed_by is null or processed_by = auth.uid())
      );
  end if;
end;
$$;

-- Allow admins to insert rows for any user
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'points_history'
      and polname = 'Admins can insert points history'
  ) then
    create policy "Admins can insert points history"
      on public.points_history
      for insert
      with check (is_admin(auth.uid()));
  end if;
end;
$$;

-- 3) Admin audit table
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

-- Only admins can view/insert audit logs
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

-- 4) Admin RPC: adjust user points (add/subtract/set) + audit
create or replace function public.admin_adjust_user_points(
  p_target_user_id uuid,
  p_adjustment_type text, -- 'add' | 'subtract' | 'set'
  p_points numeric,
  p_reason text,
  p_notes text default null
)
returns table(success boolean, new_balance numeric, points_delta numeric)
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
    raise exception 'Permission denied';
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
    raise exception 'Invalid adjustment_type. Expected add|subtract|set';
  end if;

  -- Call central award function
  select ap.success, ap.new_balance, ap.points_awarded
    into v_success, v_new_balance, v_points_awarded
  from public.award_points(
    p_target_user_id,
    'admin_adjustment',
    v_final_delta,
    coalesce(p_notes, 'Admin adjustment: ' || p_reason),
    null, -- related_entity_id
    null, -- related_entity_type
    v_admin
  ) as ap;

  -- Audit trail
  insert into public.points_admin_audit (
    admin_user_id, target_user_id, adjustment_type, points_change, reason, notes
  ) values (
    v_admin, p_target_user_id, p_adjustment_type, v_final_delta, p_reason, p_notes
  );

  return query
  select v_success, v_new_balance, v_final_delta;
end;
$$;

-- 5) Admin RPC: delegate points between two users (out/in) + audit
create or replace function public.admin_delegate_points(
  p_from_user_id uuid,
  p_to_user_id uuid,
  p_points numeric,
  p_reason text,
  p_notes text default null
)
returns table(success boolean, from_new_balance numeric, to_new_balance numeric, points_transferred numeric)
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
    raise exception 'Permission denied';
  end if;

  -- Ensure sufficient balance on source user
  select coalesce(points_balance_after, 0)
    into v_from_balance
  from public.points_history
  where user_id = p_from_user_id
  order by timestamp desc
  limit 1;

  if v_from_balance < v_points then
    raise exception 'Insufficient points to delegate';
  end if;

  -- Delegation out (subtract from source)
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

  -- Delegation in (add to destination)
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

  -- Audit both sides
  insert into public.points_admin_audit (
    admin_user_id, target_user_id, adjustment_type, points_change, reason, notes, related_entity_id, related_entity_type
  ) values
    (v_admin, p_from_user_id, 'delegate_out', -v_points, p_reason, p_notes, p_to_user_id, 'user'),
    (v_admin, p_to_user_id, 'delegate_in',  v_points, p_reason, p_notes, p_from_user_id, 'user');

  return query
  select true, v_out_new_balance, v_in_new_balance, v_points;
end;
$$;

-- 6) Unified user points summary (for UI summary cards)
create or replace function public.get_user_points_summary(
  p_user_id uuid
)
returns table(
  total_points numeric,
  points_this_month numeric,
  points_last_month numeric,
  portfolio_count integer,
  recent_activity_count integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  with latest_balance as (
    select coalesce(ph.points_balance_after, 0) as balance
    from public.points_history ph
    where ph.user_id = p_user_id
    order by ph.timestamp desc
    limit 1
  ),
  point_stats as (
    select
      coalesce(sum(case when ph.timestamp >= date_trunc('month', current_date) then ph.points_change else 0 end), 0) as this_month,
      coalesce(sum(case when ph.timestamp >= date_trunc('month', current_date - interval '1 month')
                        and ph.timestamp <  date_trunc('month', current_date) then ph.points_change else 0 end), 0) as last_month,
      count(case when ph.timestamp >= current_date - interval '7 days' then 1 end) as recent_count
    from public.points_history ph
    where ph.user_id = p_user_id
  ),
  portfolios as (
    select count(distinct up.portfolio_id) as pcount
    from public.user_points up
    where up.user_id = p_user_id
  )
  select
    coalesce((select lb.balance from latest_balance lb), 0) as total_points,
    coalesce(ps.this_month, 0) as points_this_month,
    coalesce(ps.last_month, 0) as points_last_month,
    coalesce((select p.pcount from portfolios p), 0)::integer as portfolio_count,
    coalesce(ps.recent_count, 0)::integer as recent_activity_count
  from point_stats ps;
end;
$$;
