-- Ensure required columns exist on possibly pre-existing tables
-- tax_transactions
alter table public.tax_transactions
  add column if not exists payment_method text not null default 'ach',
  add column if not exists is_reimbursement boolean not null default false,
  add column if not exists portfolio_id uuid references public.portfolios(id) on delete set null,
  add column if not exists tax_year int not null;

-- tax_profiles
alter table public.tax_profiles
  add column if not exists portfolio_id uuid references public.portfolios(id) on delete set null,
  add column if not exists edelivery_consent boolean not null default false,
  add column if not exists backup_withholding boolean not null default false;

-- tax_forms_1099
alter table public.tax_forms_1099
  add column if not exists portfolio_id uuid references public.portfolios(id) on delete cascade,
  add column if not exists payer_snapshot jsonb,
  add column if not exists recipient_snapshot jsonb,
  add column if not exists iris_submission_id text,
  add column if not exists iris_status text,
  add column if not exists corrections_of uuid references public.tax_forms_1099(id),
  add column if not exists pdf_url text;
