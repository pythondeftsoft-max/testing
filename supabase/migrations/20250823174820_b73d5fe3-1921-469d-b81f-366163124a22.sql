
-- 1) Tenant profiles: allow admins to manage all tenant profiles
alter table if exists public.tenant_profiles enable row level security;

do $$
begin
  create policy "Admins can manage all tenant profiles"
    on public.tenant_profiles
    for all
    using (is_admin(auth.uid()))
    with check (is_admin(auth.uid()));
exception
  when duplicate_object then null;
end $$;

-- 2) Tenant documents: allow admins to view all documents
alter table if exists public.tenant_documents enable row level security;

do $$
begin
  create policy "Admins can view all tenant documents"
    on public.tenant_documents
    for select
    using (is_admin(auth.uid()));
exception
  when duplicate_object then null;
end $$;

-- 3) Property applications: allow admins to view all applications
alter table if exists public.property_applications enable row level security;

do $$
begin
  create policy "Admins can view all property applications"
    on public.property_applications
    for select
    using (is_admin(auth.uid()));
exception
  when duplicate_object then null;
end $$;

-- 4) Subscriptions: allow admins to manage
alter table if exists public.subscriptions enable row level security;

do $$
begin
  create policy "Admins can manage subscriptions"
    on public.subscriptions
    for all
    using (is_admin(auth.uid()))
    with check (is_admin(auth.uid()));
exception
  when duplicate_object then null;
end $$;

-- 5) Admin RPC to reset one tenant’s monthly application counter
create or replace function public.admin_reset_tenant_applications(p_tenant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.tenant_profiles
  set applications_this_month = 0,
      updated_at = now()
  where user_id = p_tenant_id;

  return found;
end;
$$;

-- 6) Admin RPC to grant a comped tenant subscription (manual/override)
-- Note: For Stripe-backed subscriptions, use your impersonation flow or a Stripe-admin path.
create or replace function public.admin_grant_tenant_subscription(
  p_user_id uuid,
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
  -- Cancel any existing active tenant subscriptions for this user
  update public.subscriptions
  set status = 'canceled',
      updated_at = now(),
      current_period_end = least(coalesce(current_period_end, now()), now())
  where user_id = p_user_id
    and role = 'tenant'
    and status = 'active';

  -- Create a new active subscription record (manual/comped)
  insert into public.subscriptions (
    user_id, plan_type, status, role, current_period_end, created_at, updated_at
  ) values (
    p_user_id, p_plan_type, 'active', 'tenant', now() + (p_months || ' months')::interval, now(), now()
  )
  returning id into v_new_id;

  return v_new_id;
end;
$$;

-- 7) Admin RPC to cancel a tenant subscription (manual/override)
create or replace function public.admin_cancel_subscription(p_subscription_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.subscriptions
  set status = 'canceled',
      updated_at = now(),
      current_period_end = least(coalesce(current_period_end, now()), now())
  where id = p_subscription_id;

  return found;
end;
$$;
