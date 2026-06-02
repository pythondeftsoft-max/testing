-- Fix ambiguous column reference in get_landlord_portfolio_overview function
CREATE OR REPLACE FUNCTION public.get_landlord_portfolio_overview(landlord_id uuid, portfolio_id uuid DEFAULT NULL::uuid, start_date text DEFAULT NULL::text, end_date text DEFAULT NULL::text)
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
      -- Calculate total units by summing unit_count, defaulting to 1 for properties without units
      COALESCE(SUM(COALESCE(p.unit_count, 1)), 0) as total_units_count,
      -- Calculate vacant units by checking property status and unit availability
      COALESCE(SUM(
        CASE 
          WHEN p.status IN ('available', 'vacant') THEN COALESCE(p.unit_count, 1)
          ELSE 0 
        END
      ), 0) as vacant_units_count,
      SUM(p.monthly_rent) as total_gross_rent
    FROM properties p
    WHERE p.owner_id = landlord_id 
      AND p.deleted_at IS NULL
      AND p.portfolio_id IS NOT NULL
      AND (get_landlord_portfolio_overview.portfolio_id IS NULL OR p.portfolio_id = get_landlord_portfolio_overview.portfolio_id)
  ),
  payment_stats AS (
    SELECT 
      COALESCE(SUM(rp.amount), 0) as total_collected
    FROM rent_payments rp
    JOIN properties p ON rp.property_id = p.id
    WHERE p.owner_id = landlord_id
      AND rp.payment_date BETWEEN start_date::DATE AND end_date::DATE
      AND p.portfolio_id IS NOT NULL
      AND (get_landlord_portfolio_overview.portfolio_id IS NULL OR p.portfolio_id = get_landlord_portfolio_overview.portfolio_id)
  ),
  time_on_market AS (
    SELECT 
      AVG(CASE 
        WHEN p.status = 'available' THEN (CURRENT_DATE - p.created_at::DATE)::NUMERIC
        ELSE NULL 
      END) as avg_days
    FROM properties p
    WHERE p.owner_id = landlord_id 
      AND p.status = 'available'
      AND p.deleted_at IS NULL
      AND p.portfolio_id IS NOT NULL
      AND (get_landlord_portfolio_overview.portfolio_id IS NULL OR p.portfolio_id = get_landlord_portfolio_overview.portfolio_id)
  ),
  expenses AS (
    SELECT 
      COALESCE(SUM(p.insurance_cost + p.mortgage_cost + p.management_fee + p.repair_costs), 0) as total_expenses
    FROM properties p
    WHERE p.owner_id = landlord_id 
      AND p.deleted_at IS NULL
      AND p.portfolio_id IS NOT NULL
      AND (get_landlord_portfolio_overview.portfolio_id IS NULL OR p.portfolio_id = get_landlord_portfolio_overview.portfolio_id)
  )
  SELECT 
    ps.total_units_count::INTEGER,
    ps.vacant_units_count::INTEGER,
    CASE 
      WHEN ps.total_units_count > 0 THEN (ps.vacant_units_count::NUMERIC / ps.total_units_count::NUMERIC * 100)
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