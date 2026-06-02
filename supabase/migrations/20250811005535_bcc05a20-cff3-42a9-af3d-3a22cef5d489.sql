-- Fix policies to use valid portfolio roles (no 'owner')

-- portfolio_tax_profiles
drop policy if exists "ptp_insert_by_portfolio_admins" on public.portfolio_tax_profiles;
create policy "ptp_insert_by_portfolio_admins" on public.portfolio_tax_profiles
for insert with check (
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type])
);

drop policy if exists "ptp_update_by_portfolio_admins" on public.portfolio_tax_profiles;
create policy "ptp_update_by_portfolio_admins" on public.portfolio_tax_profiles
for update using (true) with check (
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type])
);

-- tax_profiles portfolio-admin manage
drop policy if exists "tp_portfolio_admin_manage" on public.tax_profiles;
create policy "tp_portfolio_admin_manage" on public.tax_profiles
for all using (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type])
) with check (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type])
);

-- tax_transactions manage
drop policy if exists "tt_portfolio_manage" on public.tax_transactions;
create policy "tt_portfolio_manage" on public.tax_transactions
for all using (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'editor'::portfolio_role_type])
) with check (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type,'editor'::portfolio_role_type])
);

-- tax_forms_1099 manage
drop policy if exists "tf_portfolio_manage" on public.tax_forms_1099;
create policy "tf_portfolio_manage" on public.tax_forms_1099
for all using (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type])
) with check (
  portfolio_id is not null and has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type])
);

-- tax_iris_payloads manage
drop policy if exists "iris_payloads_manage" on public.tax_iris_payloads;
create policy "iris_payloads_manage" on public.tax_iris_payloads
for all using (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type])) with check (has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type]));

-- storage write policies
drop policy if exists "tax_forms_insert" on storage.objects;
create policy "tax_forms_insert" on storage.objects
for insert with check (
  bucket_id = 'tax-forms'
  and has_portfolio_role((storage.foldername(name))[1]::uuid, auth.uid(), ARRAY['admin_partner'::portfolio_role_type])
);

drop policy if exists "tax_forms_update" on storage.objects;
create policy "tax_forms_update" on storage.objects
for update using (
  bucket_id = 'tax-forms'
  and has_portfolio_role((storage.foldername(name))[1]::uuid, auth.uid(), ARRAY['admin_partner'::portfolio_role_type])
);

drop policy if exists "tax_forms_delete" on storage.objects;
create policy "tax_forms_delete" on storage.objects
for delete using (
  bucket_id = 'tax-forms'
  and has_portfolio_role((storage.foldername(name))[1]::uuid, auth.uid(), ARRAY['admin_partner'::portfolio_role_type])
);
