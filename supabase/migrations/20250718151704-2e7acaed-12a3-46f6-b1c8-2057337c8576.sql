
-- Create portfolio_points table to track portfolio-level point earnings
CREATE TABLE public.portfolio_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  points_awarded NUMERIC NOT NULL CHECK (points_awarded > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source_event_type TEXT NOT NULL,
  notes TEXT,
  processed_by UUID REFERENCES public.profiles(id)
);

-- Add RLS policies for portfolio_points
ALTER TABLE public.portfolio_points ENABLE ROW LEVEL SECURITY;

-- Portfolio admin_partners can manage portfolio points
CREATE POLICY "Portfolio admin_partners can manage portfolio points" ON public.portfolio_points
  FOR ALL USING (
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner']::portfolio_role_type[])
  );

-- Portfolio members can view portfolio points (transparency)
CREATE POLICY "Portfolio members can view portfolio points" ON public.portfolio_points
  FOR SELECT USING (
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner', 'editor', 'viewer']::portfolio_role_type[])
  );

-- System can insert portfolio points
CREATE POLICY "System can insert portfolio points" ON public.portfolio_points
  FOR INSERT WITH CHECK (true);

-- Create function to award points to a portfolio
CREATE OR REPLACE FUNCTION public.award_portfolio_points(
  p_portfolio_id UUID,
  p_source_event_type TEXT,
  p_points_awarded NUMERIC,
  p_property_id UUID DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_processed_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  new_record_id UUID;
BEGIN
  -- Insert the portfolio points record
  INSERT INTO public.portfolio_points (
    portfolio_id,
    source_event_type,
    points_awarded,
    property_id,
    tenant_id,
    notes,
    processed_by
  ) VALUES (
    p_portfolio_id,
    p_source_event_type,
    p_points_awarded,
    p_property_id,
    p_tenant_id,
    p_notes,
    COALESCE(p_processed_by, auth.uid())
  )
  RETURNING id INTO new_record_id;
  
  RETURN new_record_id;
END;
$$;

-- Create function to get portfolio points summary
CREATE OR REPLACE FUNCTION public.get_portfolio_points_summary(p_portfolio_id UUID)
RETURNS TABLE(
  total_points NUMERIC,
  points_this_month NUMERIC,
  points_last_month NUMERIC,
  top_source_event TEXT,
  recent_activity_count INTEGER
)
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH summary_stats AS (
    SELECT 
      COALESCE(SUM(points_awarded), 0) as total_pts,
      COALESCE(SUM(CASE 
        WHEN created_at >= date_trunc('month', CURRENT_DATE) 
        THEN points_awarded 
        ELSE 0 
      END), 0) as this_month_pts,
      COALESCE(SUM(CASE 
        WHEN created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
        AND created_at < date_trunc('month', CURRENT_DATE)
        THEN points_awarded 
        ELSE 0 
      END), 0) as last_month_pts,
      COUNT(CASE 
        WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' 
        THEN 1 
      END) as recent_count
    FROM public.portfolio_points
    WHERE portfolio_id = p_portfolio_id
  ),
  top_event AS (
    SELECT source_event_type
    FROM public.portfolio_points
    WHERE portfolio_id = p_portfolio_id
    GROUP BY source_event_type
    ORDER BY SUM(points_awarded) DESC
    LIMIT 1
  )
  SELECT 
    ss.total_pts,
    ss.this_month_pts,
    ss.last_month_pts,
    COALESCE(te.source_event_type, 'none') as top_source,
    ss.recent_count::INTEGER
  FROM summary_stats ss
  CROSS JOIN (SELECT source_event_type FROM top_event UNION SELECT 'none' LIMIT 1) te;
END;
$$;

-- Create index for better query performance
CREATE INDEX idx_portfolio_points_portfolio_id ON public.portfolio_points(portfolio_id);
CREATE INDEX idx_portfolio_points_created_at ON public.portfolio_points(created_at);
CREATE INDEX idx_portfolio_points_source_event ON public.portfolio_points(source_event_type);
