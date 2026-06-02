
-- 1) Create table for RBAC event logs
create table if not exists public.rbac_event_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null,
  scope text not null,                      -- 'account' | 'portfolio'
  object_name text not null,                -- e.g. 'admin.users'
  action text not null,                     -- 'view' | 'edit' | 'create' | 'delete'
  portfolio_id uuid null,
  allowed boolean not null default false,
  source text default 'client',
  route text default '/',
  user_agent text default '',
  metadata jsonb not null default '{}'::jsonb
);

-- Optional FK to profiles table (NOT to auth.users, per guidance).
-- If profiles.id is UUID user id, this is safe. If not, comment this out.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    alter table public.rbac_event_logs
      add constraint rbac_event_logs_user_fk
      foreign key (user_id) references public.profiles(id)
      on delete set null;
  end if;
exception when duplicate_object then
  -- constraint already exists
  null;
end $$;

-- Indexes for faster filtering
create index if not exists rbac_event_logs_created_at_idx on public.rbac_event_logs (created_at desc);
create index if not exists rbac_event_logs_user_id_idx on public.rbac_event_logs (user_id);
create index if not exists rbac_event_logs_scope_idx on public.rbac_event_logs (scope);
create index if not exists rbac_event_logs_object_idx on public.rbac_event_logs (object_name);
create index if not exists rbac_event_logs_action_idx on public.rbac_event_logs (action);
create index if not exists rbac_event_logs_allowed_idx on public.rbac_event_logs (allowed);
create index if not exists rbac_event_logs_portfolio_idx on public.rbac_event_logs (portfolio_id);

-- 2) Enable RLS
alter table public.rbac_event_logs enable row level security;

-- 3) RLS policies

-- Allow inserting your own logs
create policy if not exists "rbac_logs_insert_own"
on public.rbac_event_logs
for insert
to authenticated
with check (auth.uid() = user_id);

-- Allow selecting your own logs
create policy if not exists "rbac_logs_select_own"
on public.rbac_event_logs
for select
to authenticated
using (auth.uid() = user_id);

-- (Optional future hardening) If you want account admins to see all logs,
-- replace the select policy with a policy that checks account_roles.
-- Example (works only if account_roles is readable by the current user):
-- using (
--   auth.uid() = user_id OR
--   exists (
--     select 1 from public.account_roles ar
--     where ar.user_id = auth.uid()
--       and ar.is_active = true
--       and ar.role_name in ('owner', 'admin_partner')
--   )
-- );

-- 4) RPC function used by the client: log_rbac_event(...)
-- Returns the inserted row.
create or replace function public.log_rbac_event(
  p_scope text,
  p_object text,
  p_action text,
  p_portfolio_id uuid default null,
  p_allowed boolean default false,
  p_source text default 'client',
  p_route text default '/',
  p_user_agent text default '',
  p_metadata jsonb default '{}'::jsonb
)
returns public.rbac_event_logs
language sql
security definer
set search_path = public
as $$
  insert into public.rbac_event_logs (
    user_id,
    scope,
    object_name,
    action,
    portfolio_id,
    allowed,
    source,
    route,
    user_agent,
    metadata
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
  )
  returning *;
$$;

-- Grant execute to anon & authenticated so the client can call it
grant execute on function public.log_rbac_event(text, text, text, uuid, boolean, text, text, text, jsonb)
  to anon, authenticated;
