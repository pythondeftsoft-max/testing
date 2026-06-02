-- Fix compute_1099_candidates to use enum values '1099_nec'/'1099_misc'
create or replace function public.compute_1099_candidates(p_portfolio uuid, p_year int)
returns table (
  recipient_id uuid,
  form_type text,
  total numeric
) language sql stable security definer set search_path = '' as $$
  with tx as (
    select *
    from public.tax_transactions
    where portfolio_id = p_portfolio
      and tax_year = p_year
      and coalesce(is_tax_exempt,false) = false
  ),
  nec as (
    select payee_id as recipient_id, '1099_nec'::text as form_type,
           sum(amount) as total
    from tx
    where payment_method in ('ach','check') and coalesce(is_reimbursement,false) = false
      and form_type = '1099_nec'
    group by payee_id
  ),
  misc as (
    select payee_id as recipient_id, '1099_misc'::text as form_type,
           sum(amount) as total
    from tx
    where form_type = '1099_misc'
    group by payee_id
  )
  select * from nec
  union all
  select * from misc;
$$;