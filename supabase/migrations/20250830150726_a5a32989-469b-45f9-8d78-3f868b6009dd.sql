
-- 1) Normalization helper (IMMUTABLE so it can be used in views/index expressions)
create or replace function public.normalize_text(input text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(coalesce(input, ''), '[^a-zA-Z0-9]+', ' ', 'g'));
$$;

-- 2) View: duplicate single-family properties by owner (same normalized address)
-- Shows owner_id, normalized address, count, and involved property ids + addresses
create or replace view public.duplicates_single_family_by_owner as
with base as (
  select
    id,
    owner_id,
    address,
    property_type,
    deleted_at,
    public.normalize_text(address) as norm_address
  from public.properties
  where property_type = 'house' and deleted_at is null
),
dups as (
  select owner_id, norm_address, count(*) as duplicate_count
  from base
  group by owner_id, norm_address
  having count(*) > 1
)
select
  d.owner_id,
  d.norm_address,
  d.duplicate_count,
  array_agg(b.id order by b.id) as property_ids,
  array_agg(coalesce(b.address, '')) as addresses
from dups d
join base b on b.owner_id = d.owner_id and b.norm_address = d.norm_address
group by d.owner_id, d.norm_address, d.duplicate_count
order by d.duplicate_count desc;

-- 3) View: duplicate units within the same property (same normalized unit_number)
-- Shows property_id, normalized unit id, count, and involved unit ids + unit_numbers
create or replace view public.duplicates_units as
with base as (
  select
    id,
    property_id,
    unit_number,
    public.normalize_text(unit_number) as norm_unit
  from public.property_units
),
dups as (
  select property_id, norm_unit, count(*) as duplicate_count
  from base
  group by property_id, norm_unit
  having count(*) > 1
)
select
  d.property_id,
  d.norm_unit,
  d.duplicate_count,
  array_agg(b.id order by b.id) as unit_ids,
  array_agg(coalesce(b.unit_number, '')) as unit_numbers
from dups d
join base b on b.property_id = d.property_id and b.norm_unit = d.norm_unit
group by d.property_id, d.norm_unit, d.duplicate_count
order by d.duplicate_count desc;
