
-- Create user_points table to track distributed portfolio points to individual users
CREATE TABLE public.user_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  portfolio_points_id UUID NOT NULL REFERENCES public.portfolio_points(id) ON DELETE CASCADE,
  points_awarded NUMERIC NOT NULL CHECK (points_awarded > 0),
  distribution_percent NUMERIC NOT NULL CHECK (distribution_percent >= 0 AND distribution_percent <= 100),
  source_event_type TEXT NOT NULL,
  distribution_details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT
);

-- Add RLS policies for user_points
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Users can view their own distributed points
CREATE POLICY "Users can view their own portfolio points" ON public.user_points
  FOR SELECT USING (user_id = auth.uid());

-- Portfolio admin_partners can manage distributed points
CREATE POLICY "Portfolio admin_partners can manage user points" ON public.user_points
  FOR ALL USING (
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner']::portfolio_role_type[])
  );

-- Portfolio members can view distributed points (transparency)
CREATE POLICY "Portfolio members can view user points" ON public.user_points
  FOR SELECT USING (
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner', 'editor', 'viewer']::portfolio_role_type[])
  );

-- System can insert distributed points
CREATE POLICY "System can insert user points" ON public.user_points
  FOR INSERT WITH CHECK (true);

-- Function to distribute portfolio points to users based on their allocation percentages
CREATE OR REPLACE FUNCTION public.distribute_portfolio_points(p_portfolio_points_id UUID)
RETURNS INTEGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  portfolio_point RECORD;
  distribution RECORD;
  user_points_awarded NUMERIC;
  distributions_created INTEGER := 0;
BEGIN
  -- Get the portfolio points record
  SELECT * INTO portfolio_point 
  FROM public.portfolio_points 
  WHERE id = p_portfolio_points_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Portfolio points record not found: %', p_portfolio_points_id;
  END IF;
  
  -- Distribute points to each user based on their allocation percentage
  FOR distribution IN 
    SELECT * FROM public.portfolio_points_distribution 
    WHERE portfolio_id = portfolio_point.portfolio_id 
    AND active = true
  LOOP
    -- Calculate user's share of points
    user_points_awarded := portfolio_point.points_awarded * (distribution.distribution_percent / 100.0);
    
    -- Insert user points record
    INSERT INTO public.user_points (
      user_id,
      portfolio_id,
      portfolio_points_id,
      points_awarded,
      distribution_percent,
      source_event_type,
      distribution_details,
      notes
    ) VALUES (
      distribution.user_id,
      portfolio_point.portfolio_id,
      p_portfolio_points_id,
      user_points_awarded,
      distribution.distribution_percent,
      portfolio_point.source_event_type,
      jsonb_build_object(
        'original_points', portfolio_point.points_awarded,
        'distribution_percent', distribution.distribution_percent,
        'role_tag', distribution.role_tag,
        'property_id', portfolio_point.property_id,
        'tenant_id', portfolio_point.tenant_id
      ),
      CONCAT('Distributed from portfolio points: ', portfolio_point.notes)
    );
    
    distributions_created := distributions_created + 1;
  END LOOP;
  
  RETURN distributions_created;
END;
$$;

-- Function to get user's portfolio points summary
CREATE OR REPLACE FUNCTION public.get_user_portfolio_points_summary(p_user_id UUID, p_portfolio_id UUID DEFAULT NULL)
RETURNS TABLE(
  total_points NUMERIC,
  points_this_month NUMERIC,
  points_last_month NUMERIC,
  portfolio_count INTEGER,
  recent_activity_count INTEGER
)
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
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
      END) as recent_count,
      COUNT(DISTINCT portfolio_id) as portfolio_count
    FROM public.user_points
    WHERE user_id = p_user_id
    AND (p_portfolio_id IS NULL OR portfolio_id = p_portfolio_id)
  )
  SELECT 
    us.total_pts,
    us.this_month_pts,
    us.last_month_pts,
    us.portfolio_count::INTEGER,
    us.recent_count::INTEGER
  FROM user_stats us;
END;
$$;

-- Create indexes for better query performance
CREATE INDEX idx_user_points_user_id ON public.user_points(user_id);
CREATE INDEX idx_user_points_portfolio_id ON public.user_points(portfolio_id);
CREATE INDEX idx_user_points_portfolio_points_id ON public.user_points(portfolio_points_id);
CREATE INDEX idx_user_points_created_at ON public.user_points(created_at);
CREATE INDEX idx_user_points_source_event ON public.user_points(source_event_type);

-- Create composite index for user portfolio queries
CREATE INDEX idx_user_points_user_portfolio ON public.user_points(user_id, portfolio_id);
