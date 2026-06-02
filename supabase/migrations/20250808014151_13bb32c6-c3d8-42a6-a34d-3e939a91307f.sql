-- Fix: remove default parameter to satisfy Postgres ordering rule
CREATE OR REPLACE FUNCTION public.get_revenue_breakdown_advanced(
  p_landlord_id uuid,
  p_portfolio_id uuid,
  p_start_date date,
  p_end_date date
)
RETURNS TABLE (
  source_key text,
  source_label text,
  month date,
  amount numeric,
  payments_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  WITH relevant_properties AS (
    SELECT id
    FROM public.properties p
    WHERE p.owner_id = p_landlord_id
      AND (p_portfolio_id IS NULL OR p.portfolio_id = p_portfolio_id)
      AND p.deleted_at IS NULL
  ),
  rent_base AS (
    SELECT 
      'tenant_rent'::text AS source_key,
      'Tenant Rent'::text AS source_label,
      date_trunc('month', COALESCE(rp.payment_date, rp.due_date))::date AS month,
      COALESCE(SUM(rp.amount), 0) AS amount,
      COUNT(*)::int AS payments_count
    FROM public.rent_payments rp
    WHERE rp.property_id IN (SELECT id FROM relevant_properties)
      AND COALESCE(rp.payment_date, rp.due_date) BETWEEN p_start_date AND p_end_date
      AND (rp.status IS NULL OR rp.status = 'completed')
    GROUP BY 2, 3
  ),
  rent_late_fees AS (
    SELECT 
      'late_fees'::text AS source_key,
      'Late Fees'::text AS source_label,
      date_trunc('month', COALESCE(rp.payment_date, rp.due_date))::date AS month,
      COALESCE(SUM(COALESCE(rp.late_fee_amount, 0)), 0) AS amount,
      COUNT(CASE WHEN COALESCE(rp.late_fee_amount, 0) > 0 THEN 1 END)::int AS payments_count
    FROM public.rent_payments rp
    WHERE rp.property_id IN (SELECT id FROM relevant_properties)
      AND COALESCE(rp.payment_date, rp.due_date) BETWEEN p_start_date AND p_end_date
    GROUP BY 2, 3
  ),
  rent_platform_fees AS (
    SELECT 
      'platform_fees'::text AS source_key,
      'Platform Fees'::text AS source_label,
      date_trunc('month', COALESCE(rp.payment_date, rp.due_date))::date AS month,
      COALESCE(SUM(COALESCE(rp.platform_fee_amount, 0)), 0) AS amount,
      COUNT(CASE WHEN COALESCE(rp.platform_fee_amount, 0) > 0 THEN 1 END)::int AS payments_count
    FROM public.rent_payments rp
    WHERE rp.property_id IN (SELECT id FROM relevant_properties)
      AND COALESCE(rp.payment_date, rp.due_date) BETWEEN p_start_date AND p_end_date
    GROUP BY 2, 3
  ),
  rent_tenant_fees AS (
    SELECT 
      'tenant_fees'::text AS source_key,
      'Tenant Fees'::text AS source_label,
      date_trunc('month', COALESCE(rp.payment_date, rp.due_date))::date AS month,
      COALESCE(SUM(COALESCE(rp.tenant_fee_amount, 0)), 0) AS amount,
      COUNT(CASE WHEN COALESCE(rp.tenant_fee_amount, 0) > 0 THEN 1 END)::int AS payments_count
    FROM public.rent_payments rp
    WHERE rp.property_id IN (SELECT id FROM relevant_properties)
      AND COALESCE(rp.payment_date, rp.due_date) BETWEEN p_start_date AND p_end_date
    GROUP BY 2, 3
  ),
  hap AS (
    SELECT 
      'hap_payments'::text AS source_key,
      'HAP Payments'::text AS source_label,
      date_trunc('month', COALESCE(hp.payment_date, hp.payment_period_end))::date AS month,
      COALESCE(SUM(COALESCE(hp.actual_amount, hp.expected_amount)), 0) AS amount,
      COUNT(*)::int AS payments_count
    FROM public.hap_payments hp
    WHERE (hp.property_id IS NULL OR hp.property_id IN (SELECT id FROM relevant_properties))
      AND (hp.unit_id IS NULL OR EXISTS (
        SELECT 1 FROM public.property_units pu
        JOIN public.properties p ON pu.property_id = p.id
        WHERE pu.id = hp.unit_id AND p.owner_id = p_landlord_id AND (p_portfolio_id IS NULL OR p.portfolio_id = p_portfolio_id)
      ))
      AND COALESCE(hp.payment_date, hp.payment_period_end) BETWEEN p_start_date AND p_end_date
    GROUP BY 2, 3
  )
  SELECT * FROM rent_base WHERE amount > 0
  UNION ALL
  SELECT * FROM hap WHERE amount > 0
  UNION ALL
  SELECT * FROM rent_late_fees WHERE amount > 0
  UNION ALL
  SELECT * FROM rent_platform_fees WHERE amount > 0
  UNION ALL
  SELECT * FROM rent_tenant_fees WHERE amount > 0
  ORDER BY month, source_key;
$$;