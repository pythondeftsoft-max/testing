
-- Phase 3: Portfolio Integration - Add portfolio context to referrals and analytics

-- Add portfolio context to referrals table
ALTER TABLE public.referrals 
ADD COLUMN IF NOT EXISTS source_portfolio_id uuid REFERENCES public.portfolios(id),
ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'residential',
ADD COLUMN IF NOT EXISTS referral_source_type text DEFAULT 'direct',
ADD COLUMN IF NOT EXISTS source_property_id uuid REFERENCES public.properties(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_referrals_source_portfolio ON public.referrals(source_portfolio_id);
CREATE INDEX IF NOT EXISTS idx_referrals_business_type ON public.referrals(business_type);

-- Add portfolio referral tracking
CREATE TABLE IF NOT EXISTS public.portfolio_referral_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id uuid NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  month_year date NOT NULL, -- First day of the month for aggregation
  total_referrals integer NOT NULL DEFAULT 0,
  qualified_referrals integer NOT NULL DEFAULT 0,
  total_referral_value numeric NOT NULL DEFAULT 0,
  conversion_rate numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, month_year)
);

-- Enable RLS on portfolio_referral_stats
ALTER TABLE public.portfolio_referral_stats ENABLE ROW LEVEL SECURITY;

-- Portfolio members can view referral stats
CREATE POLICY "Portfolio members can view referral stats" ON public.portfolio_referral_stats
  FOR SELECT USING (
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner', 'editor', 'viewer']::portfolio_role_type[])
  );

-- Portfolio managers can manage referral stats  
CREATE POLICY "Portfolio managers can manage referral stats" ON public.portfolio_referral_stats
  FOR ALL USING (
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner', 'editor']::portfolio_role_type[])
  );

-- Function to get portfolio referral performance
CREATE OR REPLACE FUNCTION public.get_portfolio_referral_performance(p_portfolio_id uuid, p_start_date date DEFAULT NULL, p_end_date date DEFAULT NULL)
RETURNS TABLE(
  total_referrals integer,
  qualified_referrals integer,
  pending_referrals integer,
  conversion_rate numeric,
  total_referral_value numeric,
  avg_referral_value numeric,
  month_over_month_growth numeric,
  top_referral_source text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  start_date date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
  end_date date := COALESCE(p_end_date, CURRENT_DATE);
  prev_month_start date := start_date - INTERVAL '30 days';
  prev_month_end date := start_date - INTERVAL '1 day';
BEGIN
  RETURN QUERY
  WITH current_period AS (
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified,
      COUNT(CASE WHEN status NOT IN ('qualified', 'expired') THEN 1 END) as pending,
      COALESCE(SUM(CASE WHEN status = 'qualified' THEN 100.00 ELSE 0 END), 0) as total_value
    FROM public.referrals 
    WHERE source_portfolio_id = p_portfolio_id
    AND created_at::date BETWEEN start_date AND end_date
  ),
  previous_period AS (
    SELECT 
      COUNT(*) as prev_total,
      COALESCE(SUM(CASE WHEN status = 'qualified' THEN 100.00 ELSE 0 END), 0) as prev_value
    FROM public.referrals 
    WHERE source_portfolio_id = p_portfolio_id
    AND created_at::date BETWEEN prev_month_start AND prev_month_end
  ),
  referral_sources AS (
    SELECT 
      referral_source_type,
      COUNT(*) as source_count
    FROM public.referrals 
    WHERE source_portfolio_id = p_portfolio_id
    AND created_at::date BETWEEN start_date AND end_date
    GROUP BY referral_source_type
    ORDER BY source_count DESC
    LIMIT 1
  )
  SELECT 
    cp.total::integer,
    cp.qualified::integer,
    cp.pending::integer,
    CASE WHEN cp.total > 0 THEN (cp.qualified::numeric / cp.total::numeric * 100) ELSE 0 END as conversion_rate,
    cp.total_value::numeric,
    CASE WHEN cp.qualified > 0 THEN (cp.total_value / cp.qualified) ELSE 0 END as avg_value,
    CASE 
      WHEN pp.prev_total > 0 THEN ((cp.total - pp.prev_total)::numeric / pp.prev_total::numeric * 100)
      ELSE 0 
    END as mom_growth,
    COALESCE(rs.referral_source_type, 'direct') as top_source
  FROM current_period cp
  CROSS JOIN previous_period pp
  LEFT JOIN referral_sources rs ON true;
END;
$$;

-- Function to get portfolio referral ROI
CREATE OR REPLACE FUNCTION public.get_portfolio_referral_roi(p_portfolio_id uuid)
RETURNS TABLE(
  total_referral_value numeric,
  total_portfolio_points numeric,
  estimated_tenant_value numeric,
  referral_roi_percentage numeric,
  cost_per_qualified_referral numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH referral_metrics AS (
    SELECT 
      COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_count,
      COALESCE(SUM(CASE WHEN status = 'qualified' THEN 100.00 ELSE 0 END), 0) as referral_rewards
    FROM public.referrals 
    WHERE source_portfolio_id = p_portfolio_id
    AND created_at >= CURRENT_DATE - INTERVAL '12 months'
  ),
  portfolio_metrics AS (
    SELECT 
      COALESCE(SUM(points_awarded), 0) as total_points,
      COUNT(*) as total_events
    FROM public.portfolio_points 
    WHERE portfolio_id = p_portfolio_id
    AND created_at >= CURRENT_DATE - INTERVAL '12 months'
  ),
  property_metrics AS (
    SELECT 
      COUNT(*) as total_properties,
      COALESCE(AVG(monthly_rent), 0) as avg_monthly_rent
    FROM public.properties 
    WHERE portfolio_id = p_portfolio_id
    AND deleted_at IS NULL
  )
  SELECT 
    rm.referral_rewards::numeric,
    pm.total_points::numeric,
    (rm.qualified_count * prom.avg_monthly_rent * 12)::numeric as estimated_value, -- Assume 1 year lease
    CASE 
      WHEN rm.referral_rewards > 0 THEN 
        ((rm.qualified_count * prom.avg_monthly_rent * 12 - rm.referral_rewards) / rm.referral_rewards * 100)
      ELSE 0 
    END as roi_percentage,
    CASE 
      WHEN rm.qualified_count > 0 THEN (rm.referral_rewards / rm.qualified_count)
      ELSE 0 
    END as cost_per_referral
  FROM referral_metrics rm
  CROSS JOIN portfolio_metrics pm
  CROSS JOIN property_metrics prom;
END;
$$;

-- Update referral rewards to include portfolio context
ALTER TABLE public.referral_rewards 
ADD COLUMN IF NOT EXISTS source_portfolio_id uuid REFERENCES public.portfolios(id);

-- Create updated_at trigger for portfolio_referral_stats
CREATE TRIGGER update_portfolio_referral_stats_updated_at
  BEFORE UPDATE ON public.portfolio_referral_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
