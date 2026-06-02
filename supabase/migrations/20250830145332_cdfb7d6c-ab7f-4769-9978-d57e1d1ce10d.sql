
-- 1) Normalization helpers
create or replace function public.normalize_text(input text)
returns text
language sql
stable
as $$
  select case
    when input is null then null
    else lower(regexp_replace(regexp_replace(trim(input), '[^a-zA-Z0-9]+', ' ', 'g'), '\s+', ' ', 'g'))
  end;
$$;

create or replace function public.normalize_address_text(addr text)
returns text
language sql
stable
as $$
  -- If your addresses include city/state/zip already, this is sufficient.
  -- If they do not, we can extend this later to include separate parts.
  select public.normalize_text(addr);
$$;

create or replace function public.normalize_unit_text(unit text)
returns text
language sql
stable
as $$
  select public.normalize_text(unit);
$$;

-- 2) Properties: normalized address column + trigger
alter table public.properties
  add column if not exists normalized_address text;

-- Backfill existing rows
update public.properties
set normalized_address = public.normalize_address_text(address)
where address is not null
  and (normalized_address is null or normalized_address = '');

-- Trigger function to keep normalized_address up to date
create or replace function public.set_normalized_address()
returns trigger
language plpgsql
as $func$
begin
  if new.address is not null then
    new.normalized_address := public.normalize_address_text(new.address);
  else
    new.normalized_address := null;
  end if;
  return new;
end;
$func$;

-- Create trigger on insert/update
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_set_normalized_address'
  ) then
    create trigger trg_set_normalized_address
      before insert or update of address
      on public.properties
      for each row
      execute function public.set_normalized_address();
  end if;
end $$;

-- 3) Property units: normalized unit column + trigger
alter table public.property_units
  add column if not exists normalized_unit text;

-- Backfill existing rows
update public.property_units
set normalized_unit = public.normalize_unit_text(unit_number)
where unit_number is not null
  and (normalized_unit is null or normalized_unit = '');

-- Trigger function to keep normalized_unit up to date
create or replace function public.set_normalized_unit()
returns trigger
language plpgsql
as $func$
begin
  if new.unit_number is not null then
    new.normalized_unit := public.normalize_unit_text(new.unit_number);
  else
    new.normalized_unit := null;
  end if;
  return new;
end;
$func$;

-- Create trigger on insert/update
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_set_normalized_unit'
  ) then
    create trigger trg_set_normalized_unit
      before insert or update of unit_number
      on public.property_units
      for each row
      execute function public.set_normalized_unit();
  end if;
end $$;

-- 4) Helper views to find existing duplicates (safe, read-only)
create or replace view public.duplicates_single_family_by_owner as
select
  p.owner_id,
  p.normalized_address,
  count(*) as cnt,
  array_agg(p.id) as property_ids
from public.properties p
where p.deleted_at is null
  and p.normalized_address is not null
  and coalesce(p.property_type, '') in ('single_family', 'Single Family', 'single family')
group by p.owner_id, p.normalized_address
having count(*) > 1;

create or replace view public.duplicates_units as
select
  pu.property_id,
  pu.normalized_unit,
  count(*) as cnt,
  array_agg(pu.id) as unit_ids
from public.property_units pu
where pu.normalized_unit is not null
group by pu.property_id, pu.normalized_unit
having count(*) > 1;

-- NOTE: After we clean up rows surfaced by the views above,
-- we will add these unique indexes in a follow-up migration:
--   create unique index uniq_sfh_per_owner
--     on public.properties(owner_id, normalized_address)
--     where deleted_at is null
--       and coalesce(property_type, '') in ('single_family','Single Family','single family');
--
--   create unique index uniq_unit_per_property
--     on public.property_units(property_id, normalized_unit);
