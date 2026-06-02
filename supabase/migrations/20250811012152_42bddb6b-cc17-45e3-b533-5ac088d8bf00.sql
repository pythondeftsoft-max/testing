-- Create portfolio-scoped tax profile table used by IRS E-File toggle
create table if not exists public.portfolio_tax_profiles (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  legal_name text,
  ein text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  postal_code text,
  country text default 'US',
  contact_name text,
  contact_email text,
  contact_phone text,
  edelivery_default boolean not null default true,
  w9_required_for_payouts boolean not null default true,
  iris_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id)
);

-- Updated-at trigger
drop trigger if exists trg_portfolio_tax_profiles_updated_at on public.portfolio_tax_profiles;
create trigger trg_portfolio_tax_profiles_updated_at
before update on public.portfolio_tax_profiles
for each row execute function public.update_updated_at_column();

-- Enable RLS
alter table public.portfolio_tax_profiles enable row level security;

-- Policies
drop policy if exists "Members can view portfolio tax profiles" on public.portfolio_tax_profiles;
create policy "Members can view portfolio tax profiles"
on public.portfolio_tax_profiles
for select
using (
  has_portfolio_role(portfolio_id, auth.uid(), array['admin_partner','editor','viewer']::portfolio_role_type[])
);

drop policy if exists "Managers can insert portfolio tax profiles" on public.portfolio_tax_profiles;
create policy "Managers can insert portfolio tax profiles"
on public.portfolio_tax_profiles
for insert
with check (
  has_portfolio_role(portfolio_id, auth.uid(), array['admin_partner','editor']::portfolio_role_type[])
);

drop policy if exists "Managers can update portfolio tax profiles" on public.portfolio_tax_profiles;
create policy "Managers can update portfolio tax profiles"
on public.portfolio_tax_profiles
for update
using (
  has_portfolio_role(portfolio_id, auth.uid(), array['admin_partner','editor']::portfolio_role_type[])
)
with check (
  has_portfolio_role(portfolio_id, auth.uid(), array['admin_partner','editor']::portfolio_role_type[])
);

-- Optional: restrict deletes to admin_partner only
drop policy if exists "Admins can delete portfolio tax profiles" on public.portfolio_tax_profiles;
create policy "Admins can delete portfolio tax profiles"
on public.portfolio_tax_profiles
for delete
using (
  has_portfolio_role(portfolio_id, auth.uid(), array['admin_partner']::portfolio_role_type[])
);
