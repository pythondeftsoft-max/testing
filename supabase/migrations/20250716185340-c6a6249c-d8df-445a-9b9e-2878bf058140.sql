
-- Create rewards table for managing available rewards
CREATE TABLE public.rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'gift_card',
  cost INTEGER NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  image_url TEXT,
  terms_conditions TEXT,
  stock_quantity INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Create redemptions table to track point redemptions
CREATE TABLE public.redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id),
  points_used INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  redemption_code TEXT,
  fulfillment_data JSONB,
  notes TEXT,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_by UUID REFERENCES public.profiles(id)
);

-- Add Row Level Security
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rewards table
CREATE POLICY "Anyone can view active rewards" 
  ON public.rewards 
  FOR SELECT 
  USING (status = 'active');

CREATE POLICY "Admins can manage all rewards" 
  ON public.rewards 
  FOR ALL 
  USING (is_admin(auth.uid()));

-- RLS Policies for redemptions table
CREATE POLICY "Users can view their own redemptions" 
  ON public.redemptions 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own redemptions" 
  ON public.redemptions 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all redemptions" 
  ON public.redemptions 
  FOR ALL 
  USING (is_admin(auth.uid()));

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_rewards_updated_at
  BEFORE UPDATE ON public.rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_redemptions_updated_at
  BEFORE UPDATE ON public.redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_rewards_status ON public.rewards(status);
CREATE INDEX idx_rewards_cost ON public.rewards(cost);
CREATE INDEX idx_redemptions_user_id ON public.redemptions(user_id);
CREATE INDEX idx_redemptions_status ON public.redemptions(status);
CREATE INDEX idx_redemptions_redeemed_at ON public.redemptions(redeemed_at DESC);

-- Function to handle point redemption with balance validation
CREATE OR REPLACE FUNCTION public.redeem_reward(
  p_user_id UUID,
  p_reward_id UUID,
  p_points_used INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance INTEGER;
  reward_cost INTEGER;
  reward_name TEXT;
  reward_status TEXT;
  redemption_id UUID;
  new_balance INTEGER;
BEGIN
  -- Get current user points balance
  SELECT points_balance_after INTO current_balance
  FROM points_history
  WHERE user_id = p_user_id
  ORDER BY timestamp DESC
  LIMIT 1;
  
  -- Default to 0 if no points history
  current_balance := COALESCE(current_balance, 0);
  
  -- Get reward details
  SELECT cost, name, status INTO reward_cost, reward_name, reward_status
  FROM rewards
  WHERE id = p_reward_id;
  
  -- Validate reward exists and is active
  IF reward_name IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Reward not found');
  END IF;
  
  IF reward_status != 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Reward is not available');
  END IF;
  
  -- Validate points amount matches reward cost
  IF p_points_used != reward_cost THEN
    RETURN json_build_object('success', false, 'error', 'Invalid points amount');
  END IF;
  
  -- Check if user has enough points
  IF current_balance < reward_cost THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient points');
  END IF;
  
  -- Calculate new balance
  new_balance := current_balance - reward_cost;
  
  -- Create redemption record
  INSERT INTO redemptions (user_id, reward_id, points_used, status)
  VALUES (p_user_id, p_reward_id, p_points_used, 'pending')
  RETURNING id INTO redemption_id;
  
  -- Record points deduction in points_history
  INSERT INTO points_history (
    user_id, 
    event_type, 
    points_change, 
    points_balance_after, 
    notes,
    related_entity_id,
    related_entity_type
  ) VALUES (
    p_user_id,
    'reward_redemption',
    -p_points_used,
    new_balance,
    'Redeemed: ' || reward_name,
    redemption_id,
    'redemption'
  );
  
  RETURN json_build_object(
    'success', true, 
    'redemption_id', redemption_id,
    'new_balance', new_balance,
    'message', 'Reward redeemed successfully'
  );
END;
$$;

-- Insert some sample rewards
INSERT INTO public.rewards (name, type, cost, description, status, image_url) VALUES
('$25 Amazon Gift Card', 'gift_card', 2500, 'Redeem your points for a $25 Amazon gift card. Perfect for shopping online!', 'active', 'https://images.unsplash.com/photo-1563013544-824ae1b704d3'),
('$50 Amazon Gift Card', 'gift_card', 5000, 'Redeem your points for a $50 Amazon gift card. Great value for your points!', 'active', 'https://images.unsplash.com/photo-1563013544-824ae1b704d3'),
('$10 Starbucks Gift Card', 'gift_card', 1000, 'Enjoy your favorite coffee with a $10 Starbucks gift card.', 'active', 'https://images.unsplash.com/photo-1453614512568-c4024d13c247'),
('$25 Target Gift Card', 'gift_card', 2500, 'Shop for essentials with a $25 Target gift card.', 'active', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8'),
('$100 Visa Gift Card', 'gift_card', 10000, 'Maximum flexibility with a $100 Visa gift card. Use anywhere Visa is accepted!', 'active', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d');
