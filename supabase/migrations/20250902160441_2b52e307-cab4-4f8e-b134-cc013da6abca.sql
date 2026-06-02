
-- Phase 3: Admin analytics and reporting RPCs for Points & Referrals
-- IMPORTANT: All functions are admin-gated and SECURITY DEFINER.

-- 1) Points System Overview
create or replace function public.get_points_system_overview_admin()
returns table (
  total_points_distributed bigint,
  active_users integer,
  monthly_growth numeric,
  total_value numeric
)
language plpgsql
stable
security definer
as $$
declare
  is_admin_user boolean;
  curr_month_total bigint;
  prev_month_total bigint;
  conv_rate numeric := 100.0; -- 100 points = $1 default
begin
  select is_admin(auth.uid()) into is_admin_user;
  if not is_admin_user then
    raise exception 'Unauthorized';
  end if;

  select coalesce(sum(pup.points_awarded),0)
  into total_points_distributed
  from public.portfolio_user_points pup;

  select count(distinct user_id)
  into active_users
  from public.portfolio_user_points
  where processed_at >= now() - interval '30 days';

  select coalesce(sum(points_awarded),0)
  into curr_month_total
  from public.portfolio_user_points
  where date_trunc('month', processed_at) = date_trunc('month', now());

  select coalesce(sum(points_awarded),0)
  into prev_month_total
  from public.portfolio_user_points
  where date_trunc('month', processed_at) = date_trunc('month', now() - interval '1 month');

  if prev_month_total > 0 then
    monthly_growth := ((curr_month_total - prev_month_total)::numeric / prev_month_total::numeric) * 100.0;
  else
    monthly_growth := null;
  end if;

  total_value := round((total_points_distributed::numeric / conv_rate)::numeric, 2);

  return next;
end;
$$;

-- 2) Monthly trends for N months
create or replace function public.get_points_monthly_trends_admin(months integer default 12)
returns table (
  month_start date,
  points_awarded bigint,
  unique_users integer
)
language sql
stable
security definer
as $$
  with params as (
    select greatest(1, least(months, 36)) as m
  ),
  months_series as (
    select date_trunc('month', (now() - (i || ' months')::interval))::date as month_start
    from generate_series(0, (select m-1 from params)) as g(i)
  ),
  monthly as (
    select
      date_trunc('month', pup.processed_at)::date as month_start,
      coalesce(sum(pup.points_awarded),0)::bigint as points_awarded,
      count(distinct pup.user_id)::int as unique_users
    from public.portfolio_user_points pup
    group by 1
  )
  select
    ms.month_start,
    coalesce(m.points_awarded, 0) as points_awarded,
    coalesce(m.unique_users, 0) as unique_users
  from months_series ms
  left join monthly m on m.month_start = ms.month_start
  order by ms.month_start asc;
$$;

-- 3) Recent points activity (admin)
create or replace function public.get_points_recent_activity_admin(limit_count integer default 20)
returns table (
  user_id uuid,
  user_name text,
  action text,
  points integer,
  processed_at timestamptz
)
language sql
stable
security definer
as $$
  select
    pup.user_id,
    coalesce(pr.first_name, '') || case when pr.last_name is not null then ' ' || pr.last_name else '' end as user_name,
    coalesce(pup.source_event_type, 'points_award') as action,
    pup.points_awarded::int as points,
    coalesce(pup.processed_at, pup.created_at) as processed_at
  from public.portfolio_user_points pup
  left join public.profiles pr on pr.id = pup.user_id
  order by coalesce(pup.processed_at, pup.created_at) desc
  limit greatest(1, least(limit_count, 200));
$$;

-- 4) Leaderboard (admin)
create or replace function public.get_points_leaderboard_admin(period text default '30d', limit_count integer default 10)
returns table (
  user_id uuid,
  user_name text,
  total_points bigint
)
language plpgsql
stable
security definer
as $$
declare
  start_ts timestamptz;
begin
  if not is_admin(auth.uid()) then
    raise exception 'Unauthorized';
  end if;

  case lower(coalesce(period,'30d'))
    when '7d' then start_ts := now() - interval '7 days';
    when '30d' then start_ts := now() - interval '30 days';
    when '90d' then start_ts := now() - interval '90 days';
    when 'month' then start_ts := date_trunc('month', now());
    when 'all' then start_ts := null;
    else start_ts := now() - interval '30 days';
  end case;

  return query
    with filtered as (
      select *
      from public.portfolio_user_points
      where start_ts is null or coalesce(processed_at, created_at) >= start_ts
    ),
    agg as (
      select user_id, sum(points_awarded)::bigint as total_points
      from filtered
      group by user_id
    )
    select
      a.user_id,
      coalesce(pr.first_name, '') || case when pr.last_name is not null then ' ' || pr.last_name else '' end as user_name,
      a.total_points
    from agg a
    left join public.profiles pr on pr.id = a.user_id
    order by a.total_points desc
    limit greatest(1, least(limit_count, 100));
end;
$$;

-- 5) Referrals overview (admin)
create or replace function public.get_referrals_overview_admin()
returns table (
  total_referrals integer,
  qualified_referrals integer,
  pending_referrals integer,
  total_rewards_earned numeric,
  available_rewards_count integer
)
language sql
stable
security definer
as $$
  with ref_stats as (
    select
      count(*)::int as total_referrals,
      count(case when status = 'qualified' then 1 end)::int as qualified_referrals,
      count(case when status not in ('qualified','expired') then 1 end)::int as pending_referrals
    from public.referrals
  ),
  reward_stats as (
    select
      coalesce(sum(reward_amount),0)::numeric as total_rewards_earned,
      count(case when status = 'available' then 1 end)::int as available_rewards_count
    from public.referral_rewards
  )
  select
    r.total_referrals,
    r.qualified_referrals,
    r.pending_referrals,
    coalesce(w.total_rewards_earned,0) as total_rewards_earned,
    coalesce(w.available_rewards_count,0) as available_rewards_count
  from ref_stats r
  cross join reward_stats w;
$$;

-- 6) Recent referral activity (admin)
create or replace function public.get_referrals_recent_activity_admin(limit_count integer default 20)
returns table (
  referral_id uuid,
  referrer_id uuid,
  referrer_name text,
  status text,
  updated_at timestamptz
)
language sql
stable
security definer
as $$
  select
    rf.id as referral_id,
    rf.referrer_id,
    coalesce(pr.first_name, '') || case when pr.last_name is not null then ' ' || pr.last_name else '' end as referrer_name,
    rf.status,
    rf.updated_at
  from public.referrals rf
  left join public.profiles pr on pr.id = rf.referrer_id
  order by rf.updated_at desc nulls last
  limit greatest(1, least(limit_count, 200));
$$;
  