-- Fix ambiguous portfolio_id reference in get_landlord_portfolio_overview function
DROP FUNCTION public.get_landlord_portfolio_overview(uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.get_landlord_portfolio_overview(landlord_id uuid, p_portfolio_id uuid DEFAULT NULL::uuid, start_date text DEFAULT NULL::text, end_date text DEFAULT NULL::text)
RETURNS TABLE(
  total_units integer, 
  vacant_units integer, 
  availability_rate numeric, 
  available_units integer,
  vacancy_rate numeric, 
  gross_rent numeric, 
  collected_rent numeric, 
  collection_rate numeric, 
  net_operating_income numeric, 
  avg_time_on_market numeric
)
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
  WITH unit_stats AS (
    SELECT 
      COUNT(*) as total_unit_count,
      COUNT(CASE WHEN pu.status = 'available' THEN 1 END) as available_unit_count,
      COUNT(CASE WHEN pu.status = 'vacant' THEN 1 END) as vacant_unit_count,
      SUM(COALESCE(pu.monthly_rent, p.monthly_rent)) as total_gross_rent
    FROM property_units pu
    JOIN properties p ON pu.property_id = p.id
    WHERE p.owner_id = landlord_id 
      AND p.deleted_at IS NULL
      AND (p_portfolio_id IS NULL OR p.portfolio_id = p_portfolio_id)
  ),
  payment_stats AS (
    SELECT 
      COALESCE(SUM(rp.amount), 0) as total_collected
    FROM rent_payments rp
    JOIN properties p ON rp.property_id = p.id
    WHERE p.owner_id = landlord_id
      AND rp.payment_date BETWEEN start_date::DATE AND end_date::DATE
      AND (p_portfolio_id IS NULL OR p.portfolio_id = p_portfolio_id)
  ),
  time_on_market AS (
    SELECT 
      AVG(CASE 
        WHEN pu.status = 'available' THEN (CURRENT_DATE - pu.updated_at::DATE)::NUMERIC
        ELSE NULL 
      END) as avg_days
    FROM property_units pu
    JOIN properties p ON pu.property_id = p.id
    WHERE p.owner_id = landlord_id 
      AND pu.status = 'available'
      AND p.deleted_at IS NULL
      AND (p_portfolio_id IS NULL OR p.portfolio_id = p_portfolio_id)
  ),
  expenses AS (
    SELECT 
      COALESCE(SUM(p.insurance_cost + p.mortgage_cost + p.management_fee + p.repair_costs), 0) as total_expenses
    FROM properties p
    WHERE p.owner_id = landlord_id 
      AND p.deleted_at IS NULL
      AND (p_portfolio_id IS NULL OR p.portfolio_id = p_portfolio_id)
  )
  SELECT 
    us.total_unit_count::INTEGER,
    us.vacant_unit_count::INTEGER,
    CASE 
      WHEN us.total_unit_count > 0 THEN (us.available_unit_count::NUMERIC / us.total_unit_count::NUMERIC * 100)
      ELSE 0 
    END::NUMERIC,
    us.available_unit_count::INTEGER,
    CASE 
      WHEN us.total_unit_count > 0 THEN (us.vacant_unit_count::NUMERIC / us.total_unit_count::NUMERIC * 100)
      ELSE 0 
    END::NUMERIC,
    COALESCE(us.total_gross_rent, 0)::NUMERIC,
    COALESCE(pys.total_collected, 0)::NUMERIC,
    CASE 
      WHEN us.total_gross_rent > 0 THEN (pys.total_collected / us.total_gross_rent * 100)
      ELSE 0 
    END::NUMERIC,
    (COALESCE(us.total_gross_rent, 0) - COALESCE(e.total_expenses, 0))::NUMERIC,
    COALESCE(tom.avg_days, 0)::NUMERIC
  FROM unit_stats us
  CROSS JOIN payment_stats pys
  CROSS JOIN time_on_market tom
  CROSS JOIN expenses e;
END;
$function$;