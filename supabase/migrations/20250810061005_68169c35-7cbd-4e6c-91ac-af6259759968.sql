-- Create portfolio health snapshots table for historical data
CREATE TABLE public.portfolio_health_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_units INTEGER NOT NULL DEFAULT 0,
  occupied_units INTEGER NOT NULL DEFAULT 0,
  vacant_units INTEGER NOT NULL DEFAULT 0,
  occupancy_rate NUMERIC NOT NULL DEFAULT 0,
  gross_monthly_rent NUMERIC NOT NULL DEFAULT 0,
  collected_rent NUMERIC NOT NULL DEFAULT 0,
  collection_rate NUMERIC NOT NULL DEFAULT 0,
  net_operating_income NUMERIC NOT NULL DEFAULT 0,
  maintenance_requests_open INTEGER NOT NULL DEFAULT 0,
  maintenance_requests_total INTEGER NOT NULL DEFAULT 0,
  avg_resolution_days NUMERIC NOT NULL DEFAULT 0,
  maintenance_cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  tenant_satisfaction_score NUMERIC NOT NULL DEFAULT 0,
  lease_renewals INTEGER NOT NULL DEFAULT 0,
  lease_expirations INTEGER NOT NULL DEFAULT 0,
  renewal_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, landlord_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE public.portfolio_health_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies for portfolio health snapshots
CREATE POLICY "Portfolio managers can manage their snapshots"
ON public.portfolio_health_snapshots
FOR ALL
USING (
  portfolio_id IS NULL AND landlord_id = auth.uid() OR
  portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
);

CREATE POLICY "Portfolio members can view snapshots"
ON public.portfolio_health_snapshots
FOR SELECT
USING (
  landlord_id = auth.uid() OR
  (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]))
);

-- Create industry benchmarks table
CREATE TABLE public.industry_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name TEXT NOT NULL,
  metric_category TEXT NOT NULL,
  benchmark_value NUMERIC NOT NULL,
  market_segment TEXT NOT NULL DEFAULT 'residential',
  geographic_region TEXT NOT NULL DEFAULT 'national',
  data_source TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(metric_name, market_segment, geographic_region, effective_date)
);

-- Enable RLS for industry benchmarks
ALTER TABLE public.industry_benchmarks ENABLE ROW LEVEL SECURITY;

-- Create policy for industry benchmarks (read-only for authenticated users)
CREATE POLICY "Authenticated users can view industry benchmarks"
ON public.industry_benchmarks
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Insert initial industry benchmark data
INSERT INTO public.industry_benchmarks (metric_name, metric_category, benchmark_value, market_segment, data_source) VALUES
('occupancy_rate', 'financial', 95.0, 'residential', 'National Apartment Association'),
('collection_rate', 'financial', 98.5, 'residential', 'RealPage Analytics'),
('net_operating_income_margin', 'financial', 65.0, 'residential', 'NCREIF'),
('maintenance_cost_per_unit_monthly', 'maintenance', 125.0, 'residential', 'Building Owners Association'),
('avg_resolution_days', 'maintenance', 3.5, 'residential', 'Property Management Institute'),
('tenant_satisfaction_score', 'tenant_relations', 4.2, 'residential', 'J.D. Power Property Management Study'),
('renewal_rate', 'tenant_relations', 75.0, 'residential', 'Apartment List Research');

-- Function to calculate and store portfolio health snapshot
CREATE OR REPLACE FUNCTION public.calculate_portfolio_health_snapshot(
  p_landlord_id UUID,
  p_portfolio_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  snapshot_id UUID;
  portfolio_stats RECORD;
  maintenance_stats RECORD;
  tenant_stats RECORD;
BEGIN
  -- Get portfolio overview data
  SELECT * INTO portfolio_stats
  FROM get_landlord_portfolio_overview(p_landlord_id, (CURRENT_DATE - INTERVAL '30 days')::TEXT, CURRENT_DATE::TEXT);
  
  -- Get maintenance efficiency data
  SELECT * INTO maintenance_stats
  FROM get_landlord_maintenance_efficiency(p_landlord_id);
  
  -- Get tenant/lease data
  SELECT * INTO tenant_stats
  FROM get_landlord_lease_pipeline(p_landlord_id);
  
  -- Insert snapshot
  INSERT INTO public.portfolio_health_snapshots (
    portfolio_id,
    landlord_id,
    total_units,
    occupied_units,
    vacant_units,
    occupancy_rate,
    gross_monthly_rent,
    collected_rent,
    collection_rate,
    net_operating_income,
    maintenance_requests_open,
    avg_resolution_days,
    maintenance_cost_per_unit,
    tenant_satisfaction_score,
    lease_renewals,
    renewal_rate
  ) VALUES (
    p_portfolio_id,
    p_landlord_id,
    COALESCE(portfolio_stats.total_units, 0),
    COALESCE(portfolio_stats.total_units - portfolio_stats.vacant_units, 0),
    COALESCE(portfolio_stats.vacant_units, 0),
    COALESCE(portfolio_stats.vacancy_rate, 0),
    COALESCE(portfolio_stats.gross_rent, 0),
    COALESCE(portfolio_stats.collected_rent, 0),
    COALESCE(portfolio_stats.collection_rate, 0),
    COALESCE(portfolio_stats.net_operating_income, 0),
    COALESCE(maintenance_stats.open_requests_count, 0),
    COALESCE(maintenance_stats.avg_resolution_days, 0),
    COALESCE(maintenance_stats.maintenance_cost_per_unit, 0),
    4.0, -- Default tenant satisfaction score
    COALESCE(tenant_stats.expiring_30_days, 0),
    COALESCE(tenant_stats.renewal_rate, 0)
  ) 
  ON CONFLICT (portfolio_id, landlord_id, snapshot_date) 
  DO UPDATE SET
    total_units = EXCLUDED.total_units,
    occupied_units = EXCLUDED.occupied_units,
    vacant_units = EXCLUDED.vacant_units,
    occupancy_rate = EXCLUDED.occupancy_rate,
    gross_monthly_rent = EXCLUDED.gross_monthly_rent,
    collected_rent = EXCLUDED.collected_rent,
    collection_rate = EXCLUDED.collection_rate,
    net_operating_income = EXCLUDED.net_operating_income,
    maintenance_requests_open = EXCLUDED.maintenance_requests_open,
    avg_resolution_days = EXCLUDED.avg_resolution_days,
    maintenance_cost_per_unit = EXCLUDED.maintenance_cost_per_unit,
    renewal_rate = EXCLUDED.renewal_rate,
    updated_at = now()
  RETURNING id INTO snapshot_id;
  
  RETURN snapshot_id;
END;
$$;

-- Function to get historical comparison data
CREATE OR REPLACE FUNCTION public.get_portfolio_historical_comparison(
  p_landlord_id UUID,
  p_portfolio_id UUID DEFAULT NULL,
  p_comparison_period TEXT DEFAULT 'previous_month'
)
RETURNS TABLE(
  current_occupancy_rate NUMERIC,
  previous_occupancy_rate NUMERIC,
  current_collection_rate NUMERIC,
  previous_collection_rate NUMERIC,
  current_maintenance_cost NUMERIC,
  previous_maintenance_cost NUMERIC,
  current_renewal_rate NUMERIC,
  previous_renewal_rate NUMERIC,
  occupancy_trend NUMERIC,
  collection_trend NUMERIC,
  maintenance_trend NUMERIC,
  renewal_trend NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_snapshot RECORD;
  previous_snapshot RECORD;
  comparison_date DATE;
BEGIN
  -- Calculate comparison date based on period
  CASE p_comparison_period
    WHEN 'previous_month' THEN
      comparison_date := CURRENT_DATE - INTERVAL '1 month';
    WHEN 'previous_quarter' THEN
      comparison_date := CURRENT_DATE - INTERVAL '3 months';
    WHEN 'previous_year' THEN
      comparison_date := CURRENT_DATE - INTERVAL '1 year';
    ELSE
      comparison_date := CURRENT_DATE - INTERVAL '1 month';
  END CASE;
  
  -- Get current snapshot (or create it)
  SELECT * INTO current_snapshot
  FROM portfolio_health_snapshots
  WHERE landlord_id = p_landlord_id
    AND (p_portfolio_id IS NULL OR portfolio_id = p_portfolio_id)
    AND snapshot_date = CURRENT_DATE
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no current snapshot exists, create one
  IF current_snapshot IS NULL THEN
    PERFORM calculate_portfolio_health_snapshot(p_landlord_id, p_portfolio_id);
    
    SELECT * INTO current_snapshot
    FROM portfolio_health_snapshots
    WHERE landlord_id = p_landlord_id
      AND (p_portfolio_id IS NULL OR portfolio_id = p_portfolio_id)
      AND snapshot_date = CURRENT_DATE
    ORDER BY created_at DESC
    LIMIT 1;
  END IF;
  
  -- Get previous snapshot
  SELECT * INTO previous_snapshot
  FROM portfolio_health_snapshots
  WHERE landlord_id = p_landlord_id
    AND (p_portfolio_id IS NULL OR portfolio_id = p_portfolio_id)
    AND snapshot_date <= comparison_date
  ORDER BY snapshot_date DESC
  LIMIT 1;
  
  -- Return comparison data
  RETURN QUERY SELECT
    COALESCE(current_snapshot.occupancy_rate, 0)::NUMERIC,
    COALESCE(previous_snapshot.occupancy_rate, 0)::NUMERIC,
    COALESCE(current_snapshot.collection_rate, 0)::NUMERIC,
    COALESCE(previous_snapshot.collection_rate, 0)::NUMERIC,
    COALESCE(current_snapshot.maintenance_cost_per_unit, 0)::NUMERIC,
    COALESCE(previous_snapshot.maintenance_cost_per_unit, 0)::NUMERIC,
    COALESCE(current_snapshot.renewal_rate, 0)::NUMERIC,
    COALESCE(previous_snapshot.renewal_rate, 0)::NUMERIC,
    -- Calculate trends (percentage change)
    CASE 
      WHEN previous_snapshot.occupancy_rate > 0 THEN 
        ((current_snapshot.occupancy_rate - previous_snapshot.occupancy_rate) / previous_snapshot.occupancy_rate * 100)
      ELSE 0
    END::NUMERIC,
    CASE 
      WHEN previous_snapshot.collection_rate > 0 THEN 
        ((current_snapshot.collection_rate - previous_snapshot.collection_rate) / previous_snapshot.collection_rate * 100)
      ELSE 0
    END::NUMERIC,
    CASE 
      WHEN previous_snapshot.maintenance_cost_per_unit > 0 THEN 
        ((current_snapshot.maintenance_cost_per_unit - previous_snapshot.maintenance_cost_per_unit) / previous_snapshot.maintenance_cost_per_unit * 100)
      ELSE 0
    END::NUMERIC,
    CASE 
      WHEN previous_snapshot.renewal_rate > 0 THEN 
        ((current_snapshot.renewal_rate - previous_snapshot.renewal_rate) / previous_snapshot.renewal_rate * 100)
      ELSE 0
    END::NUMERIC;
END;
$$;