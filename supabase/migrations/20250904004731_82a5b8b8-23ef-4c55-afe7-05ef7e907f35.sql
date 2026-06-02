
-- 1) Temporary application credit adjustments table
create table if not exists public.application_quota_adjustments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  delta integer not null,
  reason text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_by uuid not null,
  created_at timestamptz not null default now()
);

alter table public.application_quota_adjustments enable row level security;

do $$
begin
  create policy "Admins can manage quota adjustments"
    on public.application_quota_adjustments
    for all
    using (is_admin(auth.uid()))
    with check (is_admin(auth.uid()));
exception when duplicate_object then null;
end $$;

-- 2) Admin RPC: add/remove temporary credits
create or replace function public.admin_adjust_tenant_application_quota(
  p_tenant_id uuid,
  p_delta integer,
  p_expires_in_days integer default 7,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin(auth.uid()) then
    raise exception 'Only admins can adjust application quotas';
  end if;

  insert into public.application_quota_adjustments (tenant_id, delta, reason, expires_at, created_by)
  values (
    p_tenant_id,
    p_delta,
    p_reason,
    now() + make_interval(days => greatest(1, coalesce(p_expires_in_days, 7))),
    auth.uid()
  );

  return true;
end;
$$;

-- 3) Update the quota calculator to include adjustments
create or replace function public.check_application_quota(p_tenant_id uuid)
returns table(
  can_apply boolean,
  remaining_applications integer,
  is_subscriber boolean
) language plpgsql stable security definer as $$
declare
  v_window_start timestamptz;
  v_last_reset timestamptz;
  v_applications_count integer;
  v_is_subscriber boolean;
  v_weekly_limit integer := 5;
  v_adjust_total integer := 0;
  v_effective_limit integer;
begin
  -- Active subscription bypass
  select has_active_subscription(p_tenant_id, 'tenant') into v_is_subscriber;
  if v_is_subscriber then
    return query select true, 999, true;
    return;
  end if;

  -- Most recent reset
  select reset_at into v_last_reset
  from public.application_quota_resets
  where tenant_id = p_tenant_id
  order by reset_at desc
  limit 1;

  v_window_start := greatest(
    now() - interval '7 days',
    coalesce(v_last_reset, '1970-01-01'::timestamptz)
  );

  -- Count applications in current window
  select count(*) into v_applications_count
  from public.property_applications
  where tenant_id = p_tenant_id
    and created_at >= v_window_start;

  -- Active adjustments
  select coalesce(sum(delta), 0) into v_adjust_total
  from public.application_quota_adjustments
  where tenant_id = p_tenant_id
    and now() <= expires_at;

  v_effective_limit := v_weekly_limit + v_adjust_total;

  return query select 
    (v_applications_count < v_effective_limit),
    greatest(0, v_effective_limit - v_applications_count),
    v_is_subscriber;
end;
$$;

-- 4) Update the enforcement trigger to respect adjustments
create or replace function public.enforce_weekly_application_limit()
returns trigger language plpgsql security definer as $$
declare
  v_window_start timestamptz;
  v_last_reset timestamptz;
  v_applications_count integer;
  v_is_subscriber boolean;
  v_has_admin_push boolean;
  v_weekly_limit integer := 5;
  v_adjust_total integer := 0;
  v_effective_limit integer;
begin
  -- Subscribers: allow unlimited
  select has_active_subscription(NEW.tenant_id, 'tenant') into v_is_subscriber;
  if v_is_subscriber then
    return NEW;
  end if;

  -- Admin pushes bypass quota (existing behavior)
  select exists(
    select 1 from public.property_pushes
    where tenant_id = NEW.tenant_id
      and property_id = NEW.property_id
      and quota_bypass = true
      and now() <= expires_at
  ) into v_has_admin_push;

  if v_has_admin_push then
    return NEW;
  end if;

  -- Reset window logic
  select reset_at into v_last_reset
  from public.application_quota_resets
  where tenant_id = NEW.tenant_id
  order by reset_at desc
  limit 1;

  v_window_start := greatest(
    now() - interval '7 days',
    coalesce(v_last_reset, '1970-01-01'::timestamptz)
  );

  -- Count existing applications in the window
  select count(*) into v_applications_count
  from public.property_applications
  where tenant_id = NEW.tenant_id
    and created_at >= v_window_start;

  -- Active adjustments
  select coalesce(sum(delta), 0) into v_adjust_total
  from public.application_quota_adjustments
  where tenant_id = NEW.tenant_id
    and now() <= expires_at;

  v_effective_limit := v_weekly_limit + v_adjust_total;

  if v_applications_count >= v_effective_limit then
    raise exception 'Weekly application limit of % reached. You can apply to % more properties this week.',
      v_effective_limit, greatest(0, v_effective_limit - v_applications_count);
  end if;

  return NEW;
end;
$$;

-- 5) Generic admin subscription grant for any role (tenant/landlord/etc.)
create or replace function public.admin_grant_subscription(
  p_user_id uuid,
  p_role text,
  p_plan_type text default 'tenant_pro',
  p_months integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_id uuid;
begin
  if not is_admin(auth.uid()) then
    raise exception 'Only admins can grant subscriptions';
  end if;

  -- Cancel any existing active subscription for that role
  update public.subscriptions
  set status = 'canceled',
      updated_at = now(),
      current_period_end = least(coalesce(current_period_end, now()), now())
  where user_id = p_user_id
    and role = p_role
    and status = 'active';

  -- Insert manual override subscription
  insert into public.subscriptions (
    user_id, plan_type, status, role, current_period_end, created_at, updated_at
  ) values (
    p_user_id, p_plan_type, 'active', p_role, now() + (p_months || ' months')::interval, now(), now()
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;
