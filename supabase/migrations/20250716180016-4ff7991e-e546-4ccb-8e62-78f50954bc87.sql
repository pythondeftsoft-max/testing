
-- Create the points_history table to log all point transactions
CREATE TABLE public.points_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points_change NUMERIC NOT NULL,
  points_balance_after NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  notes TEXT,
  related_entity_id UUID,
  related_entity_type TEXT,
  processed_by UUID REFERENCES public.profiles(id)
);

-- Add Row Level Security
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own points history
CREATE POLICY "Users can view their own points history" 
  ON public.points_history 
  FOR SELECT 
  USING (user_id = auth.uid());

-- System can insert points history records
CREATE POLICY "System can insert points history" 
  ON public.points_history 
  FOR INSERT 
  WITH CHECK (true);

-- Admins can view all points history
CREATE POLICY "Admins can view all points history" 
  ON public.points_history 
  FOR ALL 
  USING (is_admin(auth.uid()));

-- Add trigger to auto-update the updated_at timestamp
CREATE TRIGGER update_points_history_updated_at
  BEFORE UPDATE ON public.points_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient querying by user and timestamp
CREATE INDEX idx_points_history_user_timestamp ON public.points_history(user_id, timestamp DESC);
CREATE INDEX idx_points_history_event_type ON public.points_history(event_type);
CREATE INDEX idx_points_history_related_entity ON public.points_history(related_entity_id, related_entity_type);
