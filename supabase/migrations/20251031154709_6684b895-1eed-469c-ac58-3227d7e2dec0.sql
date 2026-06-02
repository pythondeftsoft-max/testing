-- Create matchmaker_actions table for tracking activity
CREATE TABLE IF NOT EXISTS public.matchmaker_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  application_id UUID REFERENCES public.property_applications(id) ON DELETE CASCADE,
  points_earned INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create matchmaker_stats table for leaderboard
CREATE TABLE IF NOT EXISTS public.matchmaker_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  period TEXT NOT NULL,
  total_points INTEGER DEFAULT 0,
  placements_count INTEGER DEFAULT 0,
  avg_match_score NUMERIC DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  achievements JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_id, period)
);

-- Create worker_payouts table for commission tracking
CREATE TABLE IF NOT EXISTS public.worker_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  placements_count INTEGER DEFAULT 0,
  base_earnings NUMERIC DEFAULT 0,
  bonuses NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  payment_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(worker_id, period)
);

-- Add new columns to property_applications
ALTER TABLE public.property_applications
ADD COLUMN IF NOT EXISTS assigned_worker_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS priority_level TEXT DEFAULT 'normal' CHECK (priority_level IN ('urgent', 'normal', 'low')),
ADD COLUMN IF NOT EXISTS ai_match_score INTEGER CHECK (ai_match_score >= 0 AND ai_match_score <= 100),
ADD COLUMN IF NOT EXISTS move_in_date DATE,
ADD COLUMN IF NOT EXISTS move_in_checklist JSONB DEFAULT '{
  "lease_signed": false,
  "deposit_paid": false,
  "keys_prepared": false,
  "utilities_transferred": false,
  "inspection_scheduled": false
}',
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_matchmaker_actions_worker_id ON public.matchmaker_actions(worker_id);
CREATE INDEX IF NOT EXISTS idx_matchmaker_actions_created_at ON public.matchmaker_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matchmaker_stats_worker_id ON public.matchmaker_stats(worker_id);
CREATE INDEX IF NOT EXISTS idx_matchmaker_stats_period ON public.matchmaker_stats(period);
CREATE INDEX IF NOT EXISTS idx_worker_payouts_worker_id ON public.worker_payouts(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_payouts_status ON public.worker_payouts(status);
CREATE INDEX IF NOT EXISTS idx_property_applications_assigned_worker ON public.property_applications(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_property_applications_priority ON public.property_applications(priority_level);

-- Enable Row Level Security
ALTER TABLE public.matchmaker_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matchmaker_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for matchmaker_actions
CREATE POLICY "Admins can view all matchmaker actions"
  ON public.matchmaker_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Workers can view their own actions"
  ON public.matchmaker_actions FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid());

CREATE POLICY "System can insert matchmaker actions"
  ON public.matchmaker_actions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for matchmaker_stats
CREATE POLICY "Admins can view all matchmaker stats"
  ON public.matchmaker_stats FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Workers can view their own stats"
  ON public.matchmaker_stats FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid());

CREATE POLICY "System can manage matchmaker stats"
  ON public.matchmaker_stats FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for worker_payouts
CREATE POLICY "Admins can manage all worker payouts"
  ON public.worker_payouts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Workers can view their own payouts"
  ON public.worker_payouts FOR SELECT
  TO authenticated
  USING (worker_id = auth.uid());

-- Create function to update worker_payouts updated_at
CREATE OR REPLACE FUNCTION public.update_worker_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for worker_payouts
DROP TRIGGER IF EXISTS update_worker_payouts_updated_at_trigger ON public.worker_payouts;
CREATE TRIGGER update_worker_payouts_updated_at_trigger
  BEFORE UPDATE ON public.worker_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_worker_payouts_updated_at();

-- Create function to update matchmaker_stats updated_at
CREATE OR REPLACE FUNCTION public.update_matchmaker_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for matchmaker_stats
DROP TRIGGER IF EXISTS update_matchmaker_stats_updated_at_trigger ON public.matchmaker_stats;
CREATE TRIGGER update_matchmaker_stats_updated_at_trigger
  BEFORE UPDATE ON public.matchmaker_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_matchmaker_stats_updated_at();

-- Create function to track status changes
CREATE OR REPLACE FUNCTION public.track_application_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    NEW.status_updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for status changes
DROP TRIGGER IF EXISTS track_application_status_change_trigger ON public.property_applications;
CREATE TRIGGER track_application_status_change_trigger
  BEFORE UPDATE ON public.property_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.track_application_status_change();