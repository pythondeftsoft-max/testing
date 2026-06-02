
-- 1) Create RBAC event logs table
create table if not exists public.rbac_event_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null,
  scope text not null, -- 'account' | 'portfolio'
  object_name text not null,
  action text not null, -- 'view' | 'edit' | 'create' | 'delete'
  portfolio_id uuid null,
  allowed boolean not null default false,
  source text not null default 'client',
  route text not null default '/',
  user_agent text null,
  metadata jsonb not null default '{}'::jsonb
);

-- Performance indexes
create index if not exists idx_rbac_event_logs_created_at on public.rbac_event_logs (created_at desc);
create index if not exists idx_rbac_event_logs_user_id on public.rbac_event_logs (user_id);
create index if not exists idx_rbac_event_logs_portfolio on public.rbac_event_logs (portfolio_id);
create index if not exists idx_rbac_event_logs_action on public.rbac_event_logs (action);
create index if not exists idx_rbac_event_logs_allowed on public.rbac_event_logs (allowed);

-- 2) Enable RLS and policies
alter table public.rbac_event_logs enable row level security;

-- Users can view their own logs
create policy "Users can view their own RBAC logs"
  on public.rbac_event_logs
  for select
  using (user_id = auth.uid());

-- Admins and account owners can view all logs
-- relies on helper functions present in your DB: is_admin() and has_account_role()
create policy "Admins and account owners can view all RBAC logs"
  on public.rbac_event_logs
  for select
  using (
    is_admin(auth.uid())
    or has_account_role(auth.uid(), array['owner'::account_role_type, 'admin_partner'::account_role_type])
  );

-- Users can insert logs for themselves (extra safety even if bypassing RPC)
create policy "Users can insert their own RBAC logs"
  on public.rbac_event_logs
  for insert
  with check (user_id = auth.uid());

-- 3) RPC function to log events
create or replace function public.log_rbac_event(
  p_scope text,
  p_object text,
  p_action text,
  p_portfolio_id uuid default null,
  p_allowed boolean default false,
  p_source text default 'client',
  p_route text default null,
  p_user_agent text default null,
  p_metadata jsonb default '{}'::jsonb
) returns boolean
language plpgsql
security definer
set search_path to public
as $$
begin
  insert into public.rbac_event_logs (
    user_id, scope, object_name, action, portfolio_id, allowed, source, route, user_agent, metadata
  )
  values (
    auth.uid(),
    p_scope,
    p_object,
    p_action,
    p_portfolio_id,
    coalesce(p_allowed, false),
    coalesce(p_source, 'client'),
    coalesce(p_route, '/'),
    coalesce(p_user_agent, ''),
    coalesce(p_metadata, '{}'::jsonb)
  );
  return true;
end;
$$;

-- Allow authenticated users to call the function
grant execute on function public.log_rbac_event(text, text, text, uuid, boolean, text, text, text, jsonb) to authenticated;
