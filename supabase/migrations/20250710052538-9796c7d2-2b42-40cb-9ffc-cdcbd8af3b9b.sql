
-- Drop old DATE-based function versions that conflict with TEXT versions
DROP FUNCTION IF EXISTS public.get_engagement_metrics(start_date date, end_date date);
DROP FUNCTION IF EXISTS public.get_tenant_placement_metrics(start_date date, end_date date);
DROP FUNCTION IF EXISTS public.get_vacancy_pipeline_metrics(start_date date, end_date date);
DROP FUNCTION IF EXISTS public.get_financial_metrics(start_date date, end_date date);
DROP FUNCTION IF EXISTS public.get_marketplace_metrics(start_date date, end_date date);

-- Create missing TEXT-based analytics functions
CREATE OR REPLACE FUNCTION get_financial_metrics(start_date TEXT DEFAULT NULL, end_date TEXT DEFAULT NULL)
RETURNS TABLE(
  total_rent_due NUMERIC,
  total_rent_collected NUMERIC,
  on_time_collection_rate NUMERIC,
  total_late_fees NUMERIC,
  late_payment_count INTEGER,
  avg_payment_delay NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
  -- Set default dates if not provided
  IF start_date IS NULL THEN
    start_date := (CURRENT_DATE - INTERVAL '30 days')::TEXT;
  END IF;
  IF end_date IS NULL THEN
    end_date := CURRENT_DATE::TEXT;
  END IF;

  RETURN QUERY
  WITH payment_stats AS (
    SELECT 
      rp.amount,
      rp.due_date,
      rp.payment_date,
      rp.late_fee_amount,
      rp.days_late,
      CASE WHEN rp.payment_date <= rp.due_date THEN rp.amount ELSE 0 END as on_time_amount,
      CASE WHEN rp.days_late > 0 THEN 1 ELSE 0 END as is_late
    FROM rent_payments rp
    WHERE rp.due_date BETWEEN start_date::DATE AND end_date::DATE
  ),
  expected_rent AS (
    SELECT SUM(p.monthly_rent) as total_expected
    FROM properties p
    WHERE p.status = 'occupied' 
      AND p.deleted_at IS NULL
  )
  SELECT 
    COALESCE(er.total_expected, 0)::NUMERIC as total_rent_due,
    COALESCE(SUM(ps.amount), 0)::NUMERIC as total_rent_collected,
    CASE 
      WHEN COALESCE(er.total_expected, 0) > 0 THEN 
        (COALESCE(SUM(ps.on_time_amount), 0) / er.total_expected * 100)
      ELSE 0 
    END as on_time_collection_rate,
    COALESCE(SUM(ps.late_fee_amount), 0)::NUMERIC as total_late_fees,
    SUM(ps.is_late)::INTEGER as late_payment_count,
    COALESCE(AVG(CASE WHEN ps.days_late > 0 THEN ps.days_late END), 0)::NUMERIC as avg_payment_delay
  FROM payment_stats ps
  CROSS JOIN expected_rent er
  GROUP BY er.total_expected;
END;
$$;

-- Create marketplace metrics function with TEXT parameters
CREATE OR REPLACE FUNCTION get_marketplace_metrics(start_date TEXT DEFAULT NULL, end_date TEXT DEFAULT NULL)
RETURNS TABLE(
  total_property_views INTEGER,
  total_applications INTEGER,
  application_rate NUMERIC,
  expiring_leases_30_days INTEGER,
  expiring_leases_60_days INTEGER,
  expiring_leases_90_days INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
  -- Set default dates if not provided
  IF start_date IS NULL THEN
    start_date := (CURRENT_DATE - INTERVAL '30 days')::TEXT;
  END IF;
  IF end_date IS NULL THEN
    end_date := CURRENT_DATE::TEXT;
  END IF;

  RETURN QUERY
  WITH activity_stats AS (
    SELECT 
      (SELECT COUNT(*) FROM property_applications WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE) as applications,
      (SELECT COUNT(DISTINCT property_id) FROM property_applications WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE) as viewed_properties
  ),
  lease_expirations AS (
    SELECT 
      COUNT(CASE WHEN lease_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as exp_30,
      COUNT(CASE WHEN lease_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days' THEN 1 END) as exp_60,
      COUNT(CASE WHEN lease_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' THEN 1 END) as exp_90
    FROM properties 
    WHERE lease_end_date IS NOT NULL 
      AND status = 'occupied'
      AND deleted_at IS NULL
  )
  SELECT 
    COALESCE(ast.viewed_properties * 10, 0)::INTEGER as total_property_views, -- Estimate based on applications
    ast.applications::INTEGER as total_applications,
    CASE 
      WHEN ast.viewed_properties > 0 THEN 
        (ast.applications::NUMERIC / ast.viewed_properties::NUMERIC * 100)
      ELSE 0 
    END as application_rate,
    le.exp_30::INTEGER as expiring_leases_30_days,
    le.exp_60::INTEGER as expiring_leases_60_days,
    le.exp_90::INTEGER as expiring_leases_90_days
  FROM activity_stats ast
  CROSS JOIN lease_expirations le;
END;
$$;
