
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Growth goals table
CREATE TABLE public.growth_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('housing', 'signups', 'landlords', 'revenue', 'pipeline', 'software')),
  metric_name TEXT NOT NULL,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
  target_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  period_end DATE,
  phase TEXT NOT NULL DEFAULT 'foundation' CHECK (phase IN ('foundation', 'acceleration', 'scale', 'domination')),
  city TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Growth snapshots for historical tracking
CREATE TABLE public.growth_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES public.growth_goals(id) ON DELETE CASCADE NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.growth_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.growth_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage growth goals" ON public.growth_goals
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view growth goals" ON public.growth_goals
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage growth snapshots" ON public.growth_snapshots
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view growth snapshots" ON public.growth_snapshots
  FOR SELECT TO authenticated
  USING (true);

-- Updated_at trigger
CREATE TRIGGER set_growth_goals_updated_at
  BEFORE UPDATE ON public.growth_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed Foundation phase targets
INSERT INTO public.growth_goals (category, metric_name, timeframe, target_value, current_value, phase, city) VALUES
  ('housing', 'Placements', 'daily', 1, 0, 'foundation', 'Dallas TX'),
  ('housing', 'Placements', 'weekly', 5, 0, 'foundation', 'Dallas TX'),
  ('housing', 'Placements', 'monthly', 10, 0, 'foundation', 'Dallas TX'),
  ('housing', 'Placements', 'quarterly', 35, 0, 'foundation', 'Dallas TX'),
  ('housing', 'Placements', 'yearly', 100, 0, 'foundation', NULL),
  ('housing', 'Matches Pushed', 'daily', 3, 0, 'foundation', 'Dallas TX'),
  ('housing', 'Matches Pushed', 'weekly', 15, 0, 'foundation', 'Dallas TX'),
  ('landlords', 'Contacts Made', 'daily', 3, 0, 'foundation', 'Dallas TX'),
  ('landlords', 'Contacts Made', 'weekly', 15, 0, 'foundation', 'Dallas TX'),
  ('landlords', 'Positive Responses', 'daily', 1, 0, 'foundation', 'Dallas TX'),
  ('landlords', 'Positive Responses', 'weekly', 5, 0, 'foundation', 'Dallas TX'),
  ('landlords', 'New Partners', 'monthly', 10, 0, 'foundation', 'Dallas TX'),
  ('signups', 'Tenant Signups', 'daily', 2, 0, 'foundation', NULL),
  ('signups', 'Tenant Signups', 'weekly', 10, 0, 'foundation', NULL),
  ('signups', 'Landlord Signups', 'daily', 1, 0, 'foundation', NULL),
  ('signups', 'Landlord Signups', 'weekly', 5, 0, 'foundation', NULL),
  ('signups', 'Total Users', 'monthly', 50, 0, 'foundation', NULL),
  ('pipeline', 'Properties Added', 'daily', 1, 0, 'foundation', 'Dallas TX'),
  ('pipeline', 'Properties Added', 'weekly', 20, 0, 'foundation', 'Dallas TX'),
  ('pipeline', 'Properties in Pipeline', 'monthly', 50, 0, 'foundation', 'Dallas TX'),
  ('revenue', 'Placement Fees', 'monthly', 5000, 0, 'foundation', NULL),
  ('revenue', 'MRR', 'monthly', 2000, 0, 'foundation', NULL),
  ('revenue', 'Total Revenue', 'quarterly', 20000, 0, 'foundation', NULL),
  ('software', 'Active Users', 'monthly', 30, 0, 'foundation', NULL),
  ('software', 'Properties Managed', 'monthly', 20, 0, 'foundation', NULL);
