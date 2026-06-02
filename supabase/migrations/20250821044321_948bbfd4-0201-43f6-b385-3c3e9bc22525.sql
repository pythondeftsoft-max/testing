
-- Ensure RLS is enabled (harmless if it already is)
alter table public.portfolio_assets enable row level security;

-- Replace existing policy if it exists (idempotent-ish)
drop policy if exists "asset_select_if_portfolio_role" on public.portfolio_assets;

-- Allow SELECT on a portfolio asset only if the caller has a qualifying role on that portfolio
create policy "asset_select_if_portfolio_role"
on public.portfolio_assets
for select
to authenticated
using (
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner','editor','viewer','maintenance'])
);
