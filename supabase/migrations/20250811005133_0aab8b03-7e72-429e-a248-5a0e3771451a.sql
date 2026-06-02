-- 1) Create portfolio-level payer profile table
create table if not exists public.portfolio_tax_profiles (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  legal_name text not null,
  ein text not null,
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null default 'US',
  contact_name text,
  contact_email text,
  contact_phone text,
  edelivery_default boolean not null default true,
  w9_required_for_payouts boolean not null default true,
  iris_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(portfolio_id)
);

alter table public.portfolio_tax_profiles enable row level security;

-- RLS for portfolio_tax_profiles
drop policy if exists "ptp_read_by_portfolio_roles" on public.portfolio_tax_profiles;
create policy "ptp_read_by_portfolio_roles" on public.portfolio_tax_profiles
for select using (
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner','editor','viewer'])
);

drop policy if exists "ptp_insert_by_portfolio_admins" on public.portfolio_tax_profiles;
create policy "ptp_insert_by_portfolio_admins" on public.portfolio_tax_profiles
for insert with check (
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner','owner'])
);

drop policy if exists "ptp_update_by_portfolio_admins" on public.portfolio_tax_profiles;
create policy "ptp_update_by_portfolio_admins" on public.portfolio_tax_profiles
for update using (true) with check (
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner','owner'])
);

create index if not exists idx_ptp_portfolio on public.portfolio_tax_profiles(portfolio_id);

-- Trigger for updated_at
drop trigger if exists trg_ptp_updated on public.portfolio_tax_profiles;
create trigger trg_ptp_updated
before update on public.portfolio_tax_profiles
for each row execute function public.update_updated_at_column();

-- 2) Ensure recipient tax_profiles table exists with portfolio scoping
create table if not exists public.tax_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  portfolio_id uuid references public.portfolios(id) on delete set null,
  entity_type text not null check (entity_type in ('individual','sole_proprietorship','partnership','c_corporation','s_corporation','llc','trust','estate','other')),
  business_name text,
  individual_name text,
  tax_id_number text,
  tax_id_type text not null check (tax_id_type in ('ssn','ein','itin')),
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  state text not null,
  zip_code text not null,
  country text not null,
  backup_withholding_exempt boolean not null default false,
  fatca_exempt boolean not null default false,
  edelivery_consent boolean not null default false,
  backup_withholding boolean not null default false,
  w9_form_url text,
  w9_submitted_at timestamptz,
  w9_verified_at timestamptz,
  w9_verified_by uuid,
  status text not null default 'pending' check (status in ('pending','collected','verified','expired','exempt')),
  expiration_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tax_profiles enable row level security;

-- RLS for tax_profiles: user can view own; portfolio roles can view/manage portfolio-scoped rows
drop policy if exists "tp_users_view_own" on public.tax_profiles;
create policy "tp_users_view_own" on public.tax_profiles
for select using (user_id = auth.uid());

drop policy if exists "tp_portfolio_view" on public.tax_profiles;
create policy "tp_portfolio_view" on public.tax_profiles
for select using (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner','editor','viewer'])
);

drop policy if exists "tp_user_manage_own" on public.tax_profiles;
create policy "tp_user_manage_own" on public.tax_profiles
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "tp_portfolio_admin_manage" on public.tax_profiles;
create policy "tp_portfolio_admin_manage" on public.tax_profiles
for all using (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner','owner'])
) with check (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner','owner'])
);

create index if not exists idx_tp_portfolio on public.tax_profiles(portfolio_id);
create index if not exists idx_tp_user on public.tax_profiles(user_id);

drop trigger if exists trg_tp_updated on public.tax_profiles;
create trigger trg_tp_updated
before update on public.tax_profiles
for each row execute function public.update_updated_at_column();

-- 3) tax_transactions table with portfolio scoping
create table if not exists public.tax_transactions (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references public.portfolios(id) on delete set null,
  payer_id uuid not null,
  payee_id uuid not null,
  property_id uuid,
  transaction_type text not null,
  amount numeric not null,
  payment_date date not null,
  tax_year int not null,
  form_type text,
  description text,
  invoice_number text,
  vendor_name text,
  category_code text,
  is_tax_exempt boolean not null default false,
  exempt_reason text,
  payment_method text not null default 'ach',
  is_reimbursement boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tax_transactions enable row level security;

drop policy if exists "tt_portfolio_view" on public.tax_transactions;
create policy "tt_portfolio_view" on public.tax_transactions
for select using (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner','editor','viewer'])
);

drop policy if exists "tt_portfolio_manage" on public.tax_transactions;
create policy "tt_portfolio_manage" on public.tax_transactions
for all using (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner','editor'])
) with check (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner','editor'])
);

create index if not exists idx_tt_portfolio_year on public.tax_transactions(portfolio_id, tax_year);
create index if not exists idx_tt_payee_year on public.tax_transactions(payee_id, tax_year);

drop trigger if exists trg_tt_updated on public.tax_transactions;
create trigger trg_tt_updated
before update on public.tax_transactions
for each row execute function public.update_updated_at_column();

-- 4) tax_forms_1099 table with portfolio scoping and IRIS fields
create table if not exists public.tax_forms_1099 (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid references public.portfolios(id) on delete cascade,
  payer_id uuid not null,
  payee_id uuid not null,
  tax_year int not null,
  form_type text not null,
  total_amount numeric not null default 0,
  box_amounts jsonb not null default '{}',
  form_status text not null default 'draft' check (form_status in ('draft','generated','filed','corrected','voided')),
  generated_at timestamptz,
  filed_at timestamptz,
  pdf_url text,
  recipient_copy_sent_at timestamptz,
  recipient_delivery_method text check (recipient_delivery_method in ('email','mail','portal')),
  payer_snapshot jsonb,
  recipient_snapshot jsonb,
  iris_submission_id text,
  iris_status text,
  corrections_of uuid references public.tax_forms_1099(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tax_forms_1099 enable row level security;

drop policy if exists "tf_portfolio_view" on public.tax_forms_1099;
create policy "tf_portfolio_view" on public.tax_forms_1099
for select using (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner','editor','viewer'])
);

drop policy if exists "tf_portfolio_manage" on public.tax_forms_1099;
create policy "tf_portfolio_manage" on public.tax_forms_1099
for all using (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner','owner'])
) with check (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner','owner'])
);

create index if not exists idx_tf_portfolio_year on public.tax_forms_1099(portfolio_id, tax_year);

drop trigger if exists trg_tf_updated on public.tax_forms_1099;
create trigger trg_tf_updated
before update on public.tax_forms_1099
for each row execute function public.update_updated_at_column();

-- 5) tax_thresholds table (if not exists)
create table if not exists public.tax_thresholds (
  id uuid primary key default gen_random_uuid(),
  form_type text not null,
  tax_year int not null,
  threshold_amount numeric not null,
  category_description text,
  is_active boolean not null default true
);

alter table public.tax_thresholds enable row level security;

drop policy if exists "tax_thresholds_read" on public.tax_thresholds;
create policy "tax_thresholds_read" on public.tax_thresholds for select using (true);

-- 6) tax_iris_payloads table
create table if not exists public.tax_iris_payloads (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  tax_year int not null,
  form_type text not null check (form_type in ('1099-NEC','1099-MISC')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.tax_iris_payloads enable row level security;

drop policy if exists "iris_payloads_view" on public.tax_iris_payloads;
create policy "iris_payloads_view" on public.tax_iris_payloads
for select using (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner','editor','viewer']));

drop policy if exists "iris_payloads_manage" on public.tax_iris_payloads;
create policy "iris_payloads_manage" on public.tax_iris_payloads
for all using (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner','owner'])) with check (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner','owner']));

-- 7) RPC: compute_1099_candidates
create or replace function public.compute_1099_candidates(p_portfolio uuid, p_year int)
returns table (
  recipient_id uuid,
  form_type text,
  total numeric
) language sql stable as $$
  with tx as (
    select *
    from public.tax_transactions
    where portfolio_id = p_portfolio
      and tax_year = p_year
      and coalesce(is_tax_exempt,false) = false
  ),
  nec as (
    select payee_id as recipient_id, '1099-NEC'::text as form_type,
           sum(amount) as total
    from tx
    where payment_method in ('ach','check') and coalesce(is_reimbursement,false) = false
      and form_type = '1099-NEC'
    group by payee_id
  ),
  misc as (
    select payee_id as recipient_id, '1099-MISC'::text as form_type,
           sum(amount) as total
    from tx
    where form_type = '1099-MISC'
    group by payee_id
  )
  select * from nec
  union all
  select * from misc;
$$;

-- 8) Storage bucket for tax forms (private)
insert into storage.buckets (id, name, public)
values ('tax-forms','tax-forms', false)
on conflict (id) do nothing;

-- Storage RLS policies for tax-forms bucket
-- Allow portfolio members to read files in their portfolio folder
drop policy if exists "tax_forms_read" on storage.objects;
create policy "tax_forms_read" on storage.objects
for select using (
  bucket_id = 'tax-forms'
  and (
    -- folder format: {portfolioId}/{year}/{formId}.pdf
    has_portfolio_role((storage.foldername(name))[1]::uuid, auth.uid(), ARRAY['admin_partner','editor','viewer'])
  )
);

-- Allow admins to upload
drop policy if exists "tax_forms_insert" on storage.objects;
create policy "tax_forms_insert" on storage.objects
for insert with check (
  bucket_id = 'tax-forms'
  and has_portfolio_role((storage.foldername(name))[1]::uuid, auth.uid(), ARRAY['admin_partner','owner'])
);

-- Allow admins to update/delete
drop policy if exists "tax_forms_update" on storage.objects;
create policy "tax_forms_update" on storage.objects
for update using (
  bucket_id = 'tax-forms'
  and has_portfolio_role((storage.foldername(name))[1]::uuid, auth.uid(), ARRAY['admin_partner','owner'])
);

drop policy if exists "tax_forms_delete" on storage.objects;
create policy "tax_forms_delete" on storage.objects
for delete using (
  bucket_id = 'tax-forms'
  and has_portfolio_role((storage.foldername(name))[1]::uuid, auth.uid(), ARRAY['admin_partner','owner'])
);
