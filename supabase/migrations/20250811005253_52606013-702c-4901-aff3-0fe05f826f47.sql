-- Adjusted RLS policies to use portfolio_role_type[] casts

-- 1) portfolio_tax_profiles RLS
alter table public.portfolio_tax_profiles enable row level security;

drop policy if exists "ptp_read_by_portfolio_roles" on public.portfolio_tax_profiles;
create policy "ptp_read_by_portfolio_roles" on public.portfolio_tax_profiles
for select using (
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'editor'::portfolio_role_type,'viewer'::portfolio_role_type])
);

drop policy if exists "ptp_insert_by_portfolio_admins" on public.portfolio_tax_profiles;
create policy "ptp_insert_by_portfolio_admins" on public.portfolio_tax_profiles
for insert with check (
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'owner'::portfolio_role_type])
);

drop policy if exists "ptp_update_by_portfolio_admins" on public.portfolio_tax_profiles;
create policy "ptp_update_by_portfolio_admins" on public.portfolio_tax_profiles
for update using (true) with check (
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'owner'::portfolio_role_type])
);

-- 2) tax_profiles RLS
alter table public.tax_profiles enable row level security;

drop policy if exists "tp_portfolio_view" on public.tax_profiles;
create policy "tp_portfolio_view" on public.tax_profiles
for select using (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'editor'::portfolio_role_type,'viewer'::portfolio_role_type])
);

drop policy if exists "tp_portfolio_admin_manage" on public.tax_profiles;
create policy "tp_portfolio_admin_manage" on public.tax_profiles
for all using (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'owner'::portfolio_role_type])
) with check (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'owner'::portfolio_role_type])
);

-- 3) tax_transactions RLS
alter table public.tax_transactions enable row level security;

drop policy if exists "tt_portfolio_view" on public.tax_transactions;
create policy "tt_portfolio_view" on public.tax_transactions
for select using (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'editor'::portfolio_role_type,'viewer'::portfolio_role_type])
);

drop policy if exists "tt_portfolio_manage" on public.tax_transactions;
create policy "tt_portfolio_manage" on public.tax_transactions
for all using (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'editor'::portfolio_role_type])
) with check (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'editor'::portfolio_role_type])
);

-- 4) tax_forms_1099 RLS
alter table public.tax_forms_1099 enable row level security;

drop policy if exists "tf_portfolio_view" on public.tax_forms_1099;
create policy "tf_portfolio_view" on public.tax_forms_1099
for select using (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'editor'::portfolio_role_type,'viewer'::portfolio_role_type])
);

drop policy if exists "tf_portfolio_manage" on public.tax_forms_1099;
create policy "tf_portfolio_manage" on public.tax_forms_1099
for all using (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'owner'::portfolio_role_type])
) with check (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'owner'::portfolio_role_type])
);

-- 5) tax_iris_payloads RLS
alter table public.tax_iris_payloads enable row level security;

drop policy if exists "iris_payloads_view" on public.tax_iris_payloads;
create policy "iris_payloads_view" on public.tax_iris_payloads
for select using (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'editor'::portfolio_role_type,'viewer'::portfolio_role_type]));

drop policy if exists "iris_payloads_manage" on public.tax_iris_payloads;
create policy "iris_payloads_manage" on public.tax_iris_payloads
for all using (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'owner'::portfolio_role_type])) with check (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'owner'::portfolio_role_type]));

-- 6) Storage policies with role type casts

drop policy if exists "tax_forms_read" on storage.objects;
create policy "tax_forms_read" on storage.objects
for select using (
  bucket_id = 'tax-forms'
  and has_portfolio_role((storage.foldername(name))[1]::uuid, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'editor'::portfolio_role_type,'viewer'::portfolio_role_type])
);

drop policy if exists "tax_forms_insert" on storage.objects;
create policy "tax_forms_insert" on storage.objects
for insert with check (
  bucket_id = 'tax-forms'
  and has_portfolio_role((storage.foldername(name))[1]::uuid, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'owner'::portfolio_role_type])
);

drop policy if exists "tax_forms_update" on storage.objects;
create policy "tax_forms_update" on storage.objects
for update using (
  bucket_id = 'tax-forms'
  and has_portfolio_role((storage.foldername(name))[1]::uuid, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'owner'::portfolio_role_type])
);

drop policy if exists "tax_forms_delete" on storage.objects;
create policy "tax_forms_delete" on storage.objects
for delete using (
  bucket_id = 'tax-forms'
  and has_portfolio_role((storage.foldername(name))[1]::uuid, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'owner'::portfolio_role_type])
);
