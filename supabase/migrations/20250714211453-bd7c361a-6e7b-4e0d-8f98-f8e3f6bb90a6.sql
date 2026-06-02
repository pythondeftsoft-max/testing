-- Fix column ambiguity in landlord analytics functions by properly qualifying column references

-- Update get_landlord_portfolio_overview function
CREATE OR REPLACE FUNCTION public.get_landlord_portfolio_overview(landlord_id uuid, portfolio_id uuid DEFAULT NULL, start_date text DEFAULT NULL::text, end_date text DEFAULT NULL::text)
 RETURNS TABLE(total_units integer, vacant_units integer, vacancy_rate numeric, gross_rent numeric, collected_rent numeric, collection_rate numeric, net_operating_income numeric, avg_time_on_market numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Set default dates if not provided
  IF start_date IS NULL THEN
    start_date := (CURRENT_DATE - INTERVAL '30 days')::TEXT;
  END IF;
  IF end_date IS NULL THEN
    end_date := CURRENT_DATE::TEXT;
  END IF;

  RETURN QUERY
  WITH property_stats AS (
    SELECT 
      COUNT(*) as total_properties,
      COUNT(CASE WHEN status = 'available' THEN 1 END) as vacant_properties,
      SUM(monthly_rent) as total_gross_rent
    FROM properties 
    WHERE owner_id = landlord_id 
      AND deleted_at IS NULL
      AND (get_landlord_portfolio_overview.portfolio_id IS NULL OR properties.portfolio_id = get_landlord_portfolio_overview.portfolio_id)
  ),
  payment_stats AS (
    SELECT 
      COALESCE(SUM(rp.amount), 0) as total_collected
    FROM rent_payments rp
    JOIN properties p ON rp.property_id = p.id
    WHERE p.owner_id = landlord_id
      AND rp.payment_date BETWEEN start_date::DATE AND end_date::DATE
      AND (get_landlord_portfolio_overview.portfolio_id IS NULL OR p.portfolio_id = get_landlord_portfolio_overview.portfolio_id)
  ),
  time_on_market AS (
    SELECT 
      AVG(CASE 
        WHEN status = 'available' THEN (CURRENT_DATE - created_at::DATE)::NUMERIC
        ELSE NULL 
      END) as avg_days
    FROM properties 
    WHERE owner_id = landlord_id 
      AND status = 'available'
      AND deleted_at IS NULL
      AND (get_landlord_portfolio_overview.portfolio_id IS NULL OR properties.portfolio_id = get_landlord_portfolio_overview.portfolio_id)
  ),
  expenses AS (
    SELECT 
      COALESCE(SUM(insurance_cost + mortgage_cost + management_fee + repair_costs), 0) as total_expenses
    FROM properties 
    WHERE owner_id = landlord_id 
      AND deleted_at IS NULL
      AND (get_landlord_portfolio_overview.portfolio_id IS NULL OR properties.portfolio_id = get_landlord_portfolio_overview.portfolio_id)
  )
  SELECT 
    ps.total_properties::INTEGER,
    ps.vacant_properties::INTEGER,
    CASE 
      WHEN ps.total_properties > 0 THEN (ps.vacant_properties::NUMERIC / ps.total_properties::NUMERIC * 100)
      ELSE 0 
    END as vacancy_rate,
    COALESCE(ps.total_gross_rent, 0)::NUMERIC,
    COALESCE(pys.total_collected, 0)::NUMERIC,
    CASE 
      WHEN ps.total_gross_rent > 0 THEN (pys.total_collected / ps.total_gross_rent * 100)
      ELSE 0 
    END as collection_rate,
    (COALESCE(ps.total_gross_rent, 0) - COALESCE(e.total_expenses, 0))::NUMERIC as noi,
    COALESCE(tom.avg_days, 0)::NUMERIC
  FROM property_stats ps
  CROSS JOIN payment_stats pys
  CROSS JOIN time_on_market tom
  CROSS JOIN expenses e;
END;
$function$;

-- Update get_landlord_lease_pipeline function
CREATE OR REPLACE FUNCTION public.get_landlord_lease_pipeline(landlord_id uuid, portfolio_id uuid DEFAULT NULL)
 RETURNS TABLE(expiring_30_days integer, expiring_60_days integer, expiring_90_days integer, renewal_rate numeric, avg_days_to_lease numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH lease_expirations AS (
    SELECT 
      COUNT(CASE WHEN lease_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as exp_30,
      COUNT(CASE WHEN lease_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days' THEN 1 END) as exp_60,
      COUNT(CASE WHEN lease_end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days' THEN 1 END) as exp_90
    FROM properties 
    WHERE owner_id = landlord_id
      AND lease_end_date IS NOT NULL 
      AND status = 'occupied'
      AND deleted_at IS NULL
      AND (get_landlord_lease_pipeline.portfolio_id IS NULL OR properties.portfolio_id = get_landlord_lease_pipeline.portfolio_id)
  ),
  renewal_stats AS (
    SELECT 
      COUNT(CASE WHEN renewal_status = 'renewed' THEN 1 END)::NUMERIC as renewed,
      COUNT(*)::NUMERIC as total_renewals
    FROM lease_renewals lr
    JOIN properties p ON lr.property_id = p.id
    WHERE p.owner_id = landlord_id
      AND lr.created_at >= CURRENT_DATE - INTERVAL '12 months'
      AND (get_landlord_lease_pipeline.portfolio_id IS NULL OR p.portfolio_id = get_landlord_lease_pipeline.portfolio_id)
  ),
  leasing_stats AS (
    SELECT 
      AVG(CASE 
        WHEN status = 'occupied' AND lease_start_date IS NOT NULL THEN 
          (lease_start_date - created_at::DATE)::NUMERIC
        ELSE NULL 
      END) as avg_lease_days
    FROM properties 
    WHERE owner_id = landlord_id 
      AND lease_start_date >= CURRENT_DATE - INTERVAL '12 months'
      AND deleted_at IS NULL
      AND (get_landlord_lease_pipeline.portfolio_id IS NULL OR properties.portfolio_id = get_landlord_lease_pipeline.portfolio_id)
  )
  SELECT 
    le.exp_30::INTEGER,
    le.exp_60::INTEGER,
    le.exp_90::INTEGER,
    CASE 
      WHEN rs.total_renewals > 0 THEN (rs.renewed / rs.total_renewals * 100)
      ELSE 0 
    END as renewal_rate,
    COALESCE(ls.avg_lease_days, 0)::NUMERIC
  FROM lease_expirations le
  CROSS JOIN renewal_stats rs
  CROSS JOIN leasing_stats ls;
END;
$function$;

-- Update get_landlord_rent_delinquency function
CREATE OR REPLACE FUNCTION public.get_landlord_rent_delinquency(landlord_id uuid, portfolio_id uuid DEFAULT NULL)
 RETURNS TABLE(on_time_payment_rate numeric, late_payment_rate numeric, total_delinquency_balance numeric, late_payment_count integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH payment_stats AS (
    SELECT 
      COUNT(CASE WHEN rp.days_late = 0 THEN 1 END)::NUMERIC as on_time_payments,
      COUNT(CASE WHEN rp.days_late > 0 THEN 1 END)::NUMERIC as late_payments,
      COUNT(*)::NUMERIC as total_payments,
      COALESCE(SUM(CASE WHEN rp.days_late > 0 THEN rp.late_fee_amount ELSE 0 END), 0) as total_late_fees
    FROM rent_payments rp
    JOIN properties p ON rp.property_id = p.id
    WHERE p.owner_id = landlord_id
      AND rp.payment_date >= CURRENT_DATE - INTERVAL '12 months'
      AND (get_landlord_rent_delinquency.portfolio_id IS NULL OR p.portfolio_id = get_landlord_rent_delinquency.portfolio_id)
  ),
  current_delinquency AS (
    SELECT 
      COALESCE(SUM(
        CASE 
          WHEN rp.due_date < CURRENT_DATE AND rp.status != 'completed' THEN 
            (p.monthly_rent - COALESCE(rp.amount, 0)) + COALESCE(rp.late_fee_amount, 0)
          ELSE 0 
        END
      ), 0) as overdue_amount
    FROM properties p
    LEFT JOIN rent_payments rp ON p.id = rp.property_id 
      AND date_trunc('month', rp.due_date) = date_trunc('month', CURRENT_DATE)
    WHERE p.owner_id = landlord_id
      AND p.status = 'occupied'
      AND p.deleted_at IS NULL
      AND (get_landlord_rent_delinquency.portfolio_id IS NULL OR p.portfolio_id = get_landlord_rent_delinquency.portfolio_id)
  )
  SELECT 
    CASE 
      WHEN ps.total_payments > 0 THEN (ps.on_time_payments / ps.total_payments * 100)
      ELSE 0 
    END as on_time_rate,
    CASE 
      WHEN ps.total_payments > 0 THEN (ps.late_payments / ps.total_payments * 100)
      ELSE 0 
    END as late_rate,
    cd.overdue_amount::NUMERIC,
    ps.late_payments::INTEGER
  FROM payment_stats ps
  CROSS JOIN current_delinquency cd;
END;
$function$;

-- Update get_landlord_maintenance_efficiency function
CREATE OR REPLACE FUNCTION public.get_landlord_maintenance_efficiency(landlord_id uuid, portfolio_id uuid DEFAULT NULL)
 RETURNS TABLE(open_requests_count integer, avg_resolution_days numeric, maintenance_cost_per_unit numeric, avg_request_age_days numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH maintenance_stats AS (
    SELECT 
      COUNT(CASE WHEN mr.status != 'completed' THEN 1 END) as open_requests,
      AVG(CASE 
        WHEN mr.status = 'completed' AND mr.completed_date IS NOT NULL THEN 
          (mr.completed_date::DATE - mr.created_at::DATE)::NUMERIC
        ELSE NULL 
      END) as avg_resolution,
      AVG(CASE 
        WHEN mr.status != 'completed' THEN 
          (CURRENT_DATE - mr.created_at::DATE)::NUMERIC
        ELSE NULL 
      END) as avg_open_age
    FROM maintenance_requests mr
    JOIN properties p ON mr.property_id = p.id
    WHERE p.owner_id = landlord_id
      AND mr.created_at >= CURRENT_DATE - INTERVAL '12 months'
      AND (get_landlord_maintenance_efficiency.portfolio_id IS NULL OR p.portfolio_id = get_landlord_maintenance_efficiency.portfolio_id)
  ),
  cost_stats AS (
    SELECT 
      COUNT(DISTINCT p.id) as total_units,
      COALESCE(SUM(p.repair_costs), 0) as total_maintenance_costs
    FROM properties p
    WHERE p.owner_id = landlord_id
      AND p.deleted_at IS NULL
      AND (get_landlord_maintenance_efficiency.portfolio_id IS NULL OR p.portfolio_id = get_landlord_maintenance_efficiency.portfolio_id)
  )
  SELECT 
    COALESCE(ms.open_requests, 0)::INTEGER,
    COALESCE(ms.avg_resolution, 0)::NUMERIC,
    CASE 
      WHEN cs.total_units > 0 THEN (cs.total_maintenance_costs / cs.total_units)
      ELSE 0 
    END as cost_per_unit,
    COALESCE(ms.avg_open_age, 0)::NUMERIC
  FROM maintenance_stats ms
  CROSS JOIN cost_stats cs;
END;
$function$;

-- Update get_landlord_top_late_payers function
CREATE OR REPLACE FUNCTION public.get_landlord_top_late_payers(landlord_id uuid, portfolio_id uuid DEFAULT NULL, limit_count integer DEFAULT 5)
 RETURNS TABLE(tenant_id uuid, tenant_name text, property_address text, overdue_amount numeric, days_late integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pr.id as tenant_id,
    CONCAT(pr.first_name, ' ', pr.last_name) as tenant_name,
    p.address,
    COALESCE(
      (p.monthly_rent - COALESCE(rp.amount, 0)) + COALESCE(rp.late_fee_amount, 0), 
      p.monthly_rent
    ) as overdue_amount,
    COALESCE(rp.days_late, (CURRENT_DATE - DATE(date_trunc('month', CURRENT_DATE) + INTERVAL '1 day'))::INTEGER) as days_late
  FROM properties p
  LEFT JOIN rent_payments rp ON p.id = rp.property_id 
    AND date_trunc('month', rp.due_date) = date_trunc('month', CURRENT_DATE)
  LEFT JOIN property_applications pa ON p.id = pa.property_id AND pa.status = 'approved'
  LEFT JOIN profiles pr ON pa.tenant_id = pr.id
  WHERE p.owner_id = landlord_id
    AND p.status = 'occupied'
    AND p.deleted_at IS NULL
    AND (rp.due_date < CURRENT_DATE OR rp.id IS NULL)
    AND (rp.status != 'completed' OR rp.id IS NULL)
    AND (get_landlord_top_late_payers.portfolio_id IS NULL OR p.portfolio_id = get_landlord_top_late_payers.portfolio_id)
  ORDER BY overdue_amount DESC, days_late DESC
  LIMIT limit_count;
END;
$function$;