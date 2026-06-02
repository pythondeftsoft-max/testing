-- Create portfolio value snapshots table for time-series tracking
CREATE TABLE public.portfolio_value_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID,
  user_id UUID NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_real_estate_value NUMERIC NOT NULL DEFAULT 0,
  total_assets_value NUMERIC NOT NULL DEFAULT 0,
  total_liabilities NUMERIC NOT NULL DEFAULT 0,
  net_worth NUMERIC NOT NULL DEFAULT 0,
  property_count INTEGER NOT NULL DEFAULT 0,
  asset_count INTEGER NOT NULL DEFAULT 0,
  occupancy_rate NUMERIC NOT NULL DEFAULT 0,
  monthly_rental_income NUMERIC NOT NULL DEFAULT 0,
  monthly_expenses NUMERIC NOT NULL DEFAULT 0,
  net_operating_income NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one snapshot per user/portfolio per day
  UNIQUE(user_id, portfolio_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE public.portfolio_value_snapshots ENABLE ROW LEVEL SECURITY;

-- Portfolio members can view snapshots
CREATE POLICY "Portfolio members can view snapshots" 
ON public.portfolio_value_snapshots 
FOR SELECT 
USING (
  CASE 
    WHEN portfolio_id IS NOT NULL THEN 
      has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type])
    ELSE 
      user_id = auth.uid()
  END
);

-- Portfolio editors can manage snapshots
CREATE POLICY "Portfolio editors can manage snapshots" 
ON public.portfolio_value_snapshots 
FOR ALL 
USING (
  CASE 
    WHEN portfolio_id IS NOT NULL THEN 
      has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
    ELSE 
      user_id = auth.uid()
  END
);

-- System can insert snapshots
CREATE POLICY "System can insert snapshots" 
ON public.portfolio_value_snapshots 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_portfolio_snapshots_user_date 
ON public.portfolio_value_snapshots(user_id, snapshot_date DESC);

CREATE INDEX idx_portfolio_snapshots_portfolio_date 
ON public.portfolio_value_snapshots(portfolio_id, snapshot_date DESC) 
WHERE portfolio_id IS NOT NULL;

-- Create updated_at trigger
CREATE TRIGGER update_portfolio_snapshots_updated_at
BEFORE UPDATE ON public.portfolio_value_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Schedule daily portfolio snapshot at 22:00 UTC (after alert digest)
SELECT cron.schedule(
  'daily-portfolio-snapshots',
  '0 22 * * *', -- 22:00 UTC every day
  $$
  SELECT
    net.http_post(
        url:='https://kixsdhnfzjnxikmnbipi.supabase.co/functions/v1/portfolio-snapshotter',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpeHNkaG5mempueGlrbW5iaXBpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwMzQ2NDgsImV4cCI6MjA2NjYxMDY0OH0.bFcMmpvwle1l3JgDfwS71x_-LoYM_Ze-GteNMBd7JQ4"}'::jsonb,
        body:='{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);