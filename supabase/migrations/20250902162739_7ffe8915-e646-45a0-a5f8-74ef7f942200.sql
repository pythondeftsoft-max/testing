
-- Phase 4: Points Conversion Ledger + RPCs

-- 1) Create ledger table
create table if not exists public.point_conversions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  from_type text not null check (from_type in ('portfolio_points','gift_card_value')),
  to_type text not null check (to_type in ('portfolio_points','gift_card_value')),
  points_amount integer not null default 0,
  dollar_amount numeric(12,2) not null default 0,
  conversion_rate numeric(12,4) not null default 100,
  fee_amount numeric(12,2) not null default 0,
  status text not null default 'completed',
  notes text null,
  processed_by uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Optional helpful index
create index if not exists idx_point_conversions_user_created
  on public.point_conversions (user_id, created_at desc);

-- Keep timestamps fresh
drop trigger if exists trg_point_conversions_updated_at on public.point_conversions;
create trigger trg_point_conversions_updated_at
before update on public.point_conversions
for each row
execute function public.update_updated_at();

-- RLS
alter table public.point_conversions enable row level security;

-- Users: can view their own
drop policy if exists "Users can view own conversions" on public.point_conversions;
create policy "Users can view own conversions"
on public.point_conversions
for select
to authenticated
using (user_id = auth.uid());

-- Users: can insert their own (direction: points -> gift_card)
drop policy if exists "Users can create own conversions" on public.point_conversions;
create policy "Users can create own conversions"
on public.point_conversions
for insert
to authenticated
with check (user_id = auth.uid());

-- Admins: can view all
drop policy if exists "Admins can view all conversions" on public.point_conversions;
create policy "Admins can view all conversions"
on public.point_conversions
for select
to authenticated
using (is_admin(auth.uid()));

-- By default, no update/delete for non-admins (immutability). If desired later, add admin-only policies.

-- 2) RPC: get_user_gift_card_value
create or replace function public.get_user_gift_card_value(p_user_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  -- Auth: allow self or admin; otherwise return 0 to avoid leaking
  select case
    when (auth.uid() = p_user_id) or is_admin(auth.uid()) then
      coalesce((
        select sum(dollar_amount)
        from public.point_conversions
        where user_id = p_user_id
          and to_type = 'gift_card_value'
      ), 0)
    else 0
  end;
$$;

-- 3) RPC: convert_points
-- Converts portfolio points to gift card value, deducts points via points_history
-- Reads optional config from system_config:
--   config_key='points_conversion', config_value jsonb with keys:
--   { "points_per_dollar": 100, "minimum_points": 500, "fee_percent": 0 }
create or replace function public.convert_points(
  p_user_id uuid,
  p_points integer,
  p_notes text default null,
  p_direction text default 'points_to_gift_card'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_rate numeric := 100;          -- points per $ by default
  v_min_points integer := 500;    -- min points per conversion
  v_fee_percent numeric := 0;     -- optional future fee
  v_dollars numeric(12,2);
  v_fee_amount numeric(12,2) := 0;
  v_event_id uuid;
  v_new_balance integer := 0;
  v_cfg jsonb;
begin
  if v_caller is null then
    raise exception 'Not authenticated';
  end if;

  -- Only self or admin can convert
  if v_caller <> p_user_id and not is_admin(v_caller) then
    raise exception 'Not authorized to convert points for this user';
  end if;

  if p_direction <> 'points_to_gift_card' then
    raise exception 'Unsupported conversion direction: %', p_direction;
  end if;

  if p_points is null or p_points <= 0 then
    raise exception 'Points must be a positive integer';
  end if;

  -- Load optional config
  select config_value into v_cfg
  from public.system_config
  where config_key = 'points_conversion'
  limit 1;

  if v_cfg is not null then
    v_rate := coalesce((v_cfg->>'points_per_dollar')::numeric, v_rate);
    v_min_points := coalesce((v_cfg->>'minimum_points')::int, v_min_points);
    v_fee_percent := coalesce((v_cfg->>'fee_percent')::numeric, v_fee_percent);
  end if;

  if p_points < v_min_points then
    raise exception 'Minimum conversion is % points', v_min_points;
  end if;

  -- Compute dollar amount (round to cents)
  v_dollars := round((p_points::numeric / nullif(v_rate,0)), 2);
  if v_dollars <= 0 then
    raise exception 'Calculated dollar amount is invalid';
  end if;

  if v_fee_percent > 0 then
    v_fee_amount := round(v_dollars * (v_fee_percent / 100.0), 2);
  end if;

  -- Deduct points via points_history (negative change)
  insert into public.points_history (
    user_id,
    event_type,
    points_change,
    notes,
    processed_by
  ) values (
    p_user_id,
    'points_conversion',
    -p_points,
    coalesce(p_notes, format('Converted %s points to $%s', p_points, v_dollars)),
    v_caller
  )
  returning id into v_event_id;

  -- Record conversion ledger
  insert into public.point_conversions (
    user_id, from_type, to_type,
    points_amount, dollar_amount,
    conversion_rate, fee_amount,
    status, notes, processed_by,
    metadata
  ) values (
    p_user_id, 'portfolio_points', 'gift_card_value',
    p_points, v_dollars,
    v_rate, v_fee_amount,
    'completed', p_notes, v_caller,
    jsonb_build_object('points_history_id', v_event_id, 'direction', p_direction)
  );

  -- Return new balance (latest balance after our insert)
  select ph.points_balance_after
  into v_new_balance
  from public.points_history ph
  where ph.user_id = p_user_id
  order by ph.timestamp desc, ph.created_at desc
  limit 1;

  return json_build_object(
    'success', true,
    'points_converted', p_points,
    'dollar_amount', v_dollars,
    'fee_amount', v_fee_amount,
    'new_balance', coalesce(v_new_balance, 0)
  );
end;
$$;

-- RLS hint: convert_points/ get_user_gift_card_value are SECURITY DEFINER and already enforce caller constraints

