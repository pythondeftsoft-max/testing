
-- Replace get_enhanced_tenant_profile to only reference existing columns

CREATE OR REPLACE FUNCTION public.get_enhanced_tenant_profile(p_tenant_id uuid)
RETURNS TABLE(
  -- Basic profile info
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  user_type text,
  created_at timestamptz,

  -- Tenant profile (existing columns only)
  employment_status text,
  monthly_income numeric,
  credit_score integer,
  voucher_status text,
  voucher_amount numeric,
  move_in_window text,
  current_city text,
  current_zip text,

  -- Property and application info
  property_id uuid,
  property_address text,
  property_city text,
  property_state text,
  property_zip text,
  monthly_rent numeric,
  lease_start_date date,
  lease_end_date date,
  application_status text,
  application_date timestamptz,

  -- Risk and counts
  risk_score integer,
  unread_messages_count integer,
  open_maintenance_requests_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Basic profile info
    p.id,
    p.first_name,
    p.last_name,
    au.email,
    p.phone,
    p.user_type::text,
    p.created_at,

    -- Tenant profile (actual columns)
    tp.employment_status,
    tp.monthly_income,
    tp.credit_score,
    tp.voucher_status,
    tp.voucher_amount,
    tp.move_in_window,
    tp.city        AS current_city,
    tp.zip_code    AS current_zip,

    -- Property and application info
    prop.id        AS property_id,
    prop.address   AS property_address,
    prop.city      AS property_city,
    prop.state     AS property_state,
    prop.zipcode   AS property_zip,
    prop.monthly_rent,
    prop.lease_start_date,
    prop.lease_end_date,
    pa.status      AS application_status,
    pa.created_at  AS application_date,

    -- Risk: simple derived value from credit_score, clamped 0..100
    LEAST(GREATEST(
      COALESCE(100 - (COALESCE(tp.credit_score, 600) - 600) - 10, 50), 0), 100
    )::int AS risk_score,

    -- Counts
    COALESCE(msg_count.unread_count, 0)::int  AS unread_messages_count,
    COALESCE(maint_count.open_count, 0)::int  AS open_maintenance_requests_count

  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.id
  LEFT JOIN public.tenant_profiles tp ON tp.user_id = p.id
  LEFT JOIN public.property_applications pa
    ON pa.tenant_id = p.id AND pa.status = 'approved'
  LEFT JOIN public.properties prop ON prop.id = pa.property_id
  LEFT JOIN (
    SELECT tenant_id, COUNT(*) AS unread_count
    FROM public.tenant_communications
    WHERE read_at IS NULL
    GROUP BY tenant_id
  ) msg_count ON msg_count.tenant_id = p.id
  LEFT JOIN (
    SELECT pa2.tenant_id, COUNT(*) AS open_count
    FROM public.maintenance_requests mr
    JOIN public.property_applications pa2 ON mr.property_id = pa2.property_id
    WHERE mr.status != 'completed' AND pa2.status = 'approved'
    GROUP BY pa2.tenant_id
  ) maint_count ON maint_count.tenant_id = p.id
  WHERE p.id = p_tenant_id;
END;
$$;
