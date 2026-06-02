
-- Create the user_points table to store points balances for all users
CREATE TABLE public.user_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  points_balance NUMERIC NOT NULL DEFAULT 0,
  last_earned_at TIMESTAMP WITH TIME ZONE,
  last_redeemed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one points record per user
  UNIQUE(user_id)
);

-- Add Row Level Security
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

-- Users can view their own points
CREATE POLICY "Users can view their own points" 
  ON public.user_points 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Users can update their own points (for future point spending)
CREATE POLICY "Users can update their own points" 
  ON public.user_points 
  FOR UPDATE 
  USING (user_id = auth.uid());

-- System can insert points records for users
CREATE POLICY "System can insert points records" 
  ON public.user_points 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all points
CREATE POLICY "Admins can manage all points" 
  ON public.user_points 
  FOR ALL 
  USING (is_admin(auth.uid()));

-- Add trigger to auto-update the updated_at timestamp
CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON public.user_points
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize points wallet for new users
CREATE OR REPLACE FUNCTION public.initialize_user_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_points (user_id, points_balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger to automatically create points wallet when a user profile is created
CREATE TRIGGER on_profile_created_initialize_points
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_points();

-- Initialize points wallets for existing users (one-time migration)
INSERT INTO public.user_points (user_id, points_balance)
SELECT id, 0
FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
