
-- Phase 5: Enterprise Security Foundation

-- 0) Extensions needed for cryptographic functions and UUIDs
create extension if not exists pgcrypto with schema extensions;

-- 1) Enterprise Security Audit (immutable hash integrity)
create table if not exists public.enterprise_security_audit (
  id uuid primary key default extensions.gen_random_uuid(),
  event_type text not null,
  user_id uuid,
  resource_type text,
  resource_id text,
  action text not null,
  ip_address inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  severity text not null default 'info' check (severity in ('low','medium','high','critical','info')),
  created_at timestamptz not null default now(),
  hash text not null
);

alter table public.enterprise_security_audit enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies 
    where schemaname='public' and tablename='enterprise_security_audit' and policyname='Security admins can view all audit logs'
  ) then
    create policy "Security admins can view all audit logs"
      on public.enterprise_security_audit
      for select
      using (has_account_role(auth.uid(), array['owner'::account_role_type,'admin_partner'::account_role_type]));
  end if;
end$$;

-- Insert is performed via SECURITY DEFINER function; explicit policy is not required.

-- 2) User Sessions (risk-scored session tracking)
create table if not exists public.user_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null,
  session_token text not null unique,
  ip_address inet,
  user_agent text,
  location_data jsonb,
  device_fingerprint text,
  is_active boolean not null default true,
  last_activity timestamptz not null default now(),
  expires_at timestamptz not null,
  mfa_verified boolean not null default false,
  risk_score integer default 0 check (risk_score >= 0 and risk_score <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_sessions enable row level security;

-- RLS: users can see/update their own sessions; security admins can view/manage all; users can insert their own
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_sessions' and policyname='Users can view their own sessions'
  ) then
    create policy "Users can view their own sessions"
      on public.user_sessions
      for select
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_sessions' and policyname='Users can manage their own sessions'
  ) then
    create policy "Users can manage their own sessions"
      on public.user_sessions
      for update
      using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_sessions' and policyname='Users can insert their own sessions'
  ) then
    create policy "Users can insert their own sessions"
      on public.user_sessions
      for insert
      with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_sessions' and policyname='Security admins can view all sessions'
  ) then
    create policy "Security admins can view all sessions"
      on public.user_sessions
      for select
      using (has_account_role(auth.uid(), array['owner'::account_role_type,'admin_partner'::account_role_type]));
  end if;

  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_sessions' and policyname='Security admins can manage all sessions'
  ) then
    create policy "Security admins can manage all sessions"
      on public.user_sessions
      for update
      using (has_account_role(auth.uid(), array['owner'::account_role_type,'admin_partner'::account_role_type]));
  end if;

  -- Optional: only admins can delete sessions
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='user_sessions' and policyname='Security admins can delete sessions'
  ) then
    create policy "Security admins can delete sessions"
      on public.user_sessions
      for delete
      using (has_account_role(auth.uid(), array['owner'::account_role_type,'admin_partner'::account_role_type]));
  end if;
end$$;

-- 3) MFA Tokens (status tracking; secrets are encrypted outside of DB)
create table if not exists public.mfa_tokens (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null,
  token_type text not null check (token_type in ('totp','sms','email','backup')),
  encrypted_secret text,
  backup_codes text[],
  is_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  last_used_at timestamptz
);

alter table public.mfa_tokens enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mfa_tokens' and policyname='Users can manage their own MFA tokens') then
    create policy "Users can manage their own MFA tokens"
      on public.mfa_tokens
      for all
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mfa_tokens' and policyname='Security admins can view MFA status') then
    create policy "Security admins can view MFA status"
      on public.mfa_tokens
      for select
      using (has_account_role(auth.uid(), array['owner'::account_role_type,'admin_partner'::account_role_type]));
  end if;
end$$;

-- 4) API Rate Limits (server-managed; accessed via SECURITY DEFINER function)
create table if not exists public.api_rate_limits (
  id uuid primary key default extensions.gen_random_uuid(),
  identifier text not null,        -- user_id, ip_address or api_key
  endpoint text not null,
  requests_count integer not null default 1,
  window_start timestamptz not null default now(),
  window_duration interval not null default '1 hour'::interval,
  limit_exceeded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(identifier, endpoint, window_start)
);

alter table public.api_rate_limits enable row level security;

-- Restrict direct access; SECURITY DEFINER function will bypass RLS as table owner
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='api_rate_limits' and policyname='Service role can manage rate limits') then
    create policy "Service role can manage rate limits"
      on public.api_rate_limits
      for all
      using (current_setting('role', true) = 'service_role');
  end if;
end$$;

-- 5) Security Incidents
create table if not exists public.security_incidents (
  id uuid primary key default extensions.gen_random_uuid(),
  incident_type text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  title text not null,
  description text,
  affected_user_id uuid,
  detection_method text not null,
  status text not null default 'open' check (status in ('open','investigating','resolved','false_positive')),
  assigned_to uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.security_incidents enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='security_incidents' and policyname='Security admins can manage incidents') then
    create policy "Security admins can manage incidents"
      on public.security_incidents
      for all
      using (has_account_role(auth.uid(), array['owner'::account_role_type,'admin_partner'::account_role_type]))
      with check (has_account_role(auth.uid(), array['owner'::account_role_type,'admin_partner'::account_role_type]));
  end if;
end$$;

-- 6) Compliance Checklist
create table if not exists public.compliance_checklist (
  id uuid primary key default extensions.gen_random_uuid(),
  framework text not null check (framework in ('soc2','gdpr','hipaa','pci_dss')),
  control_id text not null,
  control_name text not null,
  control_description text,
  implementation_status text not null default 'not_implemented' check (implementation_status in ('not_implemented','in_progress','implemented','verified')),
  responsible_party uuid,
  evidence_urls text[],
  last_reviewed_at timestamptz,
  next_review_due timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(framework, control_id)
);

alter table public.compliance_checklist enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='compliance_checklist' and policyname='Account admins can manage compliance') then
    create policy "Account admins can manage compliance"
      on public.compliance_checklist
      for all
      using (has_account_role(auth.uid(), array['owner'::account_role_type,'admin_partner'::account_role_type]))
      with check (has_account_role(auth.uid(), array['owner'::account_role_type,'admin_partner'::account_role_type]));
  end if;
end$$;

-- 7) Enterprise Backup Logs (visibility only)
create table if not exists public.enterprise_backup_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  backup_type text not null check (backup_type in ('full','incremental','differential')),
  backup_scope text not null,
  status text not null check (status in ('started','in_progress','completed','failed')),
  file_path text,
  file_size_bytes bigint,
  compression_ratio numeric,
  encryption_method text,
  verification_hash text,
  retention_until timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);

alter table public.enterprise_backup_logs enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='enterprise_backup_logs' and policyname='Account admins can view backup logs') then
    create policy "Account admins can view backup logs"
      on public.enterprise_backup_logs
      for select
      using (has_account_role(auth.uid(), array['owner'::account_role_type,'admin_partner'::account_role_type]));
  end if;
end$$;

-- 8) Enterprise Settings
create table if not exists public.enterprise_settings (
  id uuid primary key default extensions.gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null,
  setting_type text not null check (setting_type in ('security','compliance','integration','monitoring')),
  is_encrypted boolean not null default false,
  last_modified_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.enterprise_settings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='enterprise_settings' and policyname='Account owners can manage enterprise settings') then
    create policy "Account owners can manage enterprise settings"
      on public.enterprise_settings
      for all
      using (has_account_role(auth.uid(), array['owner'::account_role_type]))
      with check (has_account_role(auth.uid(), array['owner'::account_role_type]));
  end if;
end$$;

-- 9) Generic updated_at triggers (use existing trigger function public.set_updated_at)
-- Create triggers safely if they don't already exist
do $$
begin
  if not exists (select 1 from pg_trigger where tgname='trg_user_sessions_set_updated_at') then
    create trigger trg_user_sessions_set_updated_at
      before update on public.user_sessions
      for each row
      execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname='trg_api_rate_limits_set_updated_at') then
    create trigger trg_api_rate_limits_set_updated_at
      before update on public.api_rate_limits
      for each row
      execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname='trg_security_incidents_set_updated_at') then
    create trigger trg_security_incidents_set_updated_at
      before update on public.security_incidents
      for each row
      execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname='trg_compliance_checklist_set_updated_at') then
    create trigger trg_compliance_checklist_set_updated_at
      before update on public.compliance_checklist
      for each row
      execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname='trg_enterprise_settings_set_updated_at') then
    create trigger trg_enterprise_settings_set_updated_at
      before update on public.enterprise_settings
      for each row
      execute function public.set_updated_at();
  end if;
end$$;

-- 10) Functions (SECURITY DEFINER with safe search_path)

-- 10a) Log security audit with hash integrity
create or replace function public.log_security_audit(
  p_event_type text,
  p_user_id uuid default null,
  p_resource_type text default null,
  p_resource_id text default null,
  p_action text default 'unknown',
  p_ip_address inet default null,
  p_user_agent text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_severity text default 'info'
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_audit_id uuid := extensions.gen_random_uuid();
  v_hash_input text;
  v_hash text;
begin
  v_hash_input := v_audit_id::text
    || coalesce(p_event_type,'')
    || coalesce(p_user_id::text,'')
    || coalesce(p_resource_type,'')
    || coalesce(p_resource_id,'')
    || coalesce(p_action,'')
    || coalesce(p_ip_address::text,'')
    || now()::text;

  v_hash := encode(extensions.digest(v_hash_input, 'sha256'), 'hex');

  insert into public.enterprise_security_audit (
    id, event_type, user_id, resource_type, resource_id, action,
    ip_address, user_agent, metadata, severity, hash
  ) values (
    v_audit_id, p_event_type, p_user_id, p_resource_type, p_resource_id, p_action,
    p_ip_address, left(coalesce(p_user_agent,''), 500), p_metadata, p_severity, v_hash
  );

  return v_audit_id;
end;
$$;

-- 10b) Create user session with basic risk scoring
create or replace function public.create_user_session(
  p_user_id uuid,
  p_session_token text,
  p_ip_address inet default null,
  p_user_agent text default null,
  p_location_data jsonb default '{}'::jsonb,
  p_device_fingerprint text default null,
  p_expires_in_hours integer default 24
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_session_id uuid := extensions.gen_random_uuid();
  v_risk_score integer := 0;
  v_expires_at timestamptz := now() + (p_expires_in_hours || ' hours')::interval;
begin
  if p_ip_address is null then v_risk_score := v_risk_score + 20; end if;
  if p_device_fingerprint is null then v_risk_score := v_risk_score + 10; end if;

  if exists (
    select 1 from public.user_sessions
    where user_id = p_user_id and is_active = true
      and (ip_address is distinct from p_ip_address)
      and created_at > now() - interval '1 hour'
  ) then
    v_risk_score := v_risk_score + 30;
  end if;

  insert into public.user_sessions (
    id, user_id, session_token, ip_address, user_agent,
    location_data, device_fingerprint, expires_at, risk_score
  ) values (
    v_session_id, p_user_id, p_session_token, p_ip_address, left(coalesce(p_user_agent,''), 500),
    p_location_data, p_device_fingerprint, v_expires_at, v_risk_score
  );

  perform public.log_security_audit(
    'session_created',
    p_user_id,
    'user_session',
    v_session_id::text,
    'create',
    p_ip_address,
    p_user_agent,
    jsonb_build_object('risk_score', v_risk_score),
    case when v_risk_score > 50 then 'high' when v_risk_score > 25 then 'medium' else 'low' end
  );

  return v_session_id;
end;
$$;

-- 10c) Server-side rate limiting
create or replace function public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer default 100,
  p_window_hours integer default 1
) returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_current_count integer;
  v_window_start timestamptz;
  v_window_duration interval;
begin
  v_window_duration := (p_window_hours || ' hours')::interval;
  -- Snap to aligned window based on p_window_hours
  v_window_start := date_trunc('hour', now()) - make_interval(hours => mod(date_part('hour', now())::int, p_window_hours));

  select coalesce(requests_count, 0)
    into v_current_count
  from public.api_rate_limits
  where identifier = p_identifier
    and endpoint = p_endpoint
    and window_start = v_window_start;

  if v_current_count >= p_max_requests then
    update public.api_rate_limits
       set limit_exceeded = true, updated_at = now()
     where identifier = p_identifier
       and endpoint = p_endpoint
       and window_start = v_window_start;

    perform public.log_security_audit(
      'rate_limit_exceeded',
      null,
      'api_endpoint',
      p_endpoint,
      'access_denied',
      null,
      null,
      jsonb_build_object('identifier', p_identifier, 'requests', v_current_count, 'limit', p_max_requests),
      'medium'
    );

    return false;
  end if;

  insert into public.api_rate_limits (identifier, endpoint, window_start, window_duration, requests_count)
  values (p_identifier, p_endpoint, v_window_start, v_window_duration, 1)
  on conflict (identifier, endpoint, window_start)
  do update set requests_count = public.api_rate_limits.requests_count + 1, updated_at = now();

  return true;
end;
$$;

-- 10d) Create security incident helper
create or replace function public.create_security_incident(
  p_incident_type text,
  p_severity text,
  p_title text,
  p_description text default null,
  p_affected_user_id uuid default null,
  p_detection_method text default 'automated',
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_incident_id uuid := extensions.gen_random_uuid();
begin
  insert into public.security_incidents (
    id, incident_type, severity, title, description,
    affected_user_id, detection_method, metadata
  ) values (
    v_incident_id, p_incident_type, p_severity, p_title, p_description,
    p_affected_user_id, p_detection_method, p_metadata
  );

  perform public.log_security_audit(
    'security_incident_created',
    p_affected_user_id,
    'security_incident',
    v_incident_id::text,
    'create',
    null,
    null,
    jsonb_build_object('incident_type', p_incident_type, 'severity', p_severity),
    p_severity
  );

  return v_incident_id;
end;
$$;

-- 10e) Update compliance control helper
create or replace function public.update_compliance_control(
  p_framework text,
  p_control_id text,
  p_implementation_status text,
  p_evidence_urls text[] default null,
  p_responsible_party uuid default null
) returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update public.compliance_checklist
     set implementation_status = p_implementation_status,
         evidence_urls = coalesce(p_evidence_urls, evidence_urls),
         responsible_party = coalesce(p_responsible_party, responsible_party),
         last_reviewed_at = now(),
         next_review_due = now() + interval '90 days',
         updated_at = now()
   where framework = p_framework
     and control_id = p_control_id;

  if not found then
    return false;
  end if;

  perform public.log_security_audit(
    'compliance_control_updated',
    auth.uid(),
    'compliance_control',
    p_framework || ':' || p_control_id,
    'update',
    null,
    null,
    jsonb_build_object('status', p_implementation_status, 'framework', p_framework),
    'info'
  );

  return true;
end;
$$;

-- 10f) Enterprise security dashboard aggregates
create or replace function public.get_enterprise_security_dashboard()
returns table(
  active_incidents integer,
  critical_incidents integer,
  high_risk_sessions integer,
  rate_limit_violations integer,
  compliance_score numeric,
  recent_security_events integer
)
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return query
  with incident_stats as (
    select 
      count(case when status != 'resolved' then 1 end) as active,
      count(case when severity = 'critical' and status != 'resolved' then 1 end) as critical
    from public.security_incidents
    where created_at > now() - interval '30 days'
  ),
  session_stats as (
    select count(*) as high_risk
    from public.user_sessions
    where is_active = true and risk_score > 50
  ),
  rate_limit_stats as (
    select count(*) as violations
    from public.api_rate_limits
    where limit_exceeded = true
      and created_at > now() - interval '24 hours'
  ),
  compliance_stats as (
    select 
      round(
        (count(case when implementation_status = 'implemented' then 1 end)::numeric
         / nullif(count(*)::numeric, 0)) * 100, 2
      ) as score
    from public.compliance_checklist
  ),
  security_events as (
    select count(*) as recent_events
    from public.enterprise_security_audit
    where created_at > now() - interval '24 hours'
      and severity in ('medium','high','critical')
  )
  select 
    coalesce(i.active, 0)::int,
    coalesce(i.critical, 0)::int,
    coalesce(s.high_risk, 0)::int,
    coalesce(r.violations, 0)::int,
    coalesce(c.score, 0),
    coalesce(e.recent_events, 0)::int
  from incident_stats i
  cross join session_stats s
  cross join rate_limit_stats r
  cross join compliance_stats c
  cross join security_events e;
end;
$$;

-- 10g) Cleanup function for expired sessions, stale rate windows, and old audit logs
create or replace function public.cleanup_expired_security_data()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_cleaned_count integer := 0;
begin
  delete from public.user_sessions
  where expires_at < now() or (is_active = false and updated_at < now() - interval '7 days');
  get diagnostics v_cleaned_count = row_count;

  delete from public.api_rate_limits
  where window_start < now() - interval '7 days';

  delete from public.enterprise_security_audit
  where created_at < now() - interval '1 year';

  return v_cleaned_count;
end;
$$;

-- 11) Indexes for performance
create index if not exists idx_enterprise_security_audit_user_id on public.enterprise_security_audit(user_id);
create index if not exists idx_enterprise_security_audit_created_at on public.enterprise_security_audit(created_at);
create index if not exists idx_enterprise_security_audit_severity on public.enterprise_security_audit(severity);

create index if not exists idx_user_sessions_user_id on public.user_sessions(user_id);
create index if not exists idx_user_sessions_active on public.user_sessions(is_active);
create index if not exists idx_user_sessions_expires_at on public.user_sessions(expires_at);

create index if not exists idx_mfa_tokens_user_id on public.mfa_tokens(user_id);
create index if not exists idx_mfa_tokens_active on public.mfa_tokens(is_active);

create index if not exists idx_api_rate_limits_identifier on public.api_rate_limits(identifier);
create index if not exists idx_api_rate_limits_endpoint on public.api_rate_limits(endpoint);
create index if not exists idx_api_rate_limits_window_start on public.api_rate_limits(window_start);

create index if not exists idx_security_incidents_status on public.security_incidents(status);
create index if not exists idx_security_incidents_severity on public.security_incidents(severity);
create index if not exists idx_security_incidents_created_at on public.security_incidents(created_at);

create index if not exists idx_compliance_checklist_framework on public.compliance_checklist(framework);
create index if not exists idx_compliance_checklist_status on public.compliance_checklist(implementation_status);
