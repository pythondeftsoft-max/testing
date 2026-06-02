
-- 1) Fix search_admin_users to compute total_points from points_history
create or replace function public.search_admin_users(
  search_query   text default null,
  type_filter    text default null,
  status_filter  text default null,
  limit_count    integer default 50,
  offset_count   integer default 0
)
returns table(
  id               uuid,
  first_name       text,
  last_name        text,
  email            text,
  user_type        text,
  account_status   text,
  total_points     numeric,
  last_sign_in_at  timestamptz,
  created_at       timestamptz,
  updated_at       timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  with latest_balance as (
    select distinct on (ph.user_id)
      ph.user_id,
      coalesce(ph.points_balance_after, 0) as balance
    from public.points_history ph
    order by ph.user_id, ph.timestamp desc
  )
  select
    p.id,
    p.first_name,
    p.last_name,
    au.email,
    p.user_type::text as user_type,
    case 
      when au.email_confirmed_at is not null then 'active'
      when au.email_confirmed_at is null then 'invited'
      else 'suspended'
    end::text as account_status,
    coalesce(lb.balance, 0)::numeric as total_points,
    au.last_sign_in_at,
    p.created_at,
    p.updated_at
  from public.profiles p
  join auth.users au on au.id = p.id
  left join latest_balance lb on lb.user_id = p.id
  where
    (search_query is null or
     p.first_name ilike '%' || search_query || '%' or
     p.last_name  ilike '%' || search_query || '%' or
     au.email     ilike '%' || search_query || '%')
    and (type_filter is null or p.user_type::text = type_filter)
    and (
      status_filter is null
      or (status_filter = 'active'   and au.email_confirmed_at is not null)
      or (status_filter = 'invited'  and au.email_confirmed_at is null)
      or (status_filter = 'suspended' and au.email_confirmed_at is null) -- keep legacy behavior
    )
  order by p.created_at desc
  limit limit_count
  offset offset_count;
end;
$$;

-- 2) Harden get_points_recent_activity_admin to rely on points_history
create or replace function public.get_points_recent_activity_admin(
  activity_limit integer default 20
)
returns table(
  id            uuid,
  user_id       uuid,
  event_type    text,
  points_change numeric,
  notes         text,
  created_at    timestamptz,
  user_name     text,
  user_email    text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return query
  select
    ph.id,
    ph.user_id,
    ph.event_type,
    ph.points_change,
    ph.notes,
    ph.timestamp as created_at,
    concat(pr.first_name, ' ', pr.last_name) as user_name,
    au.email as user_email
  from public.points_history ph
  join public.profiles pr on pr.id = ph.user_id
  join auth.users au on au.id = ph.user_id
  order by ph.timestamp desc
  limit activity_limit;
end;
$$;
