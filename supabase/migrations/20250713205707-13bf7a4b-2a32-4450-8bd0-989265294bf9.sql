-- Create referrals table to track referral relationships and status
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_email TEXT NOT NULL,
  referred_user_id UUID NULL,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Milestone tracking
  registered_at TIMESTAMP WITH TIME ZONE NULL,
  approved_at TIMESTAMP WITH TIME ZONE NULL,
  first_payment_at TIMESTAMP WITH TIME ZONE NULL,
  sixty_day_milestone_at TIMESTAMP WITH TIME ZONE NULL,
  
  -- Property context
  property_id UUID NULL,
  
  CONSTRAINT referrals_status_check CHECK (status IN ('pending', 'registered', 'approved', 'first_payment', 'qualified', 'expired'))
);

-- Create referral_rewards table to track earned rewards
CREATE TABLE public.referral_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  referral_id UUID NULL,
  reward_type TEXT NOT NULL,
  reward_amount NUMERIC NULL,
  reward_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  claimed_at TIMESTAMP WITH TIME ZONE NULL,
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  
  CONSTRAINT referral_rewards_status_check CHECK (status IN ('pending', 'available', 'claimed', 'expired')),
  CONSTRAINT referral_rewards_type_check CHECK (reward_type IN ('gift_card', 'background_check_waiver', 'application_fee_waiver', 'milestone_bonus'))
);

-- Enable Row Level Security
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for referrals
CREATE POLICY "Users can view their own referrals" 
ON public.referrals 
FOR SELECT 
USING (referrer_id = auth.uid() OR referred_user_id = auth.uid());

CREATE POLICY "Users can create referrals" 
ON public.referrals 
FOR INSERT 
WITH CHECK (referrer_id = auth.uid());

CREATE POLICY "System can update referrals" 
ON public.referrals 
FOR UPDATE 
USING (true);

-- RLS Policies for referral_rewards
CREATE POLICY "Users can view their own rewards" 
ON public.referral_rewards 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can manage rewards" 
ON public.referral_rewards 
FOR ALL 
USING (true);

-- Create indexes for performance
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_referred_user_id ON public.referrals(referred_user_id);
CREATE INDEX idx_referrals_status ON public.referrals(status);
CREATE INDEX idx_referral_rewards_user_id ON public.referral_rewards(user_id);

-- Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code
    code := upper(substr(md5(random()::text), 1, 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.referrals WHERE referral_code = code) INTO exists;
    
    -- Exit loop if code is unique
    IF NOT exists THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Create function to update referral milestones
CREATE OR REPLACE FUNCTION public.update_referral_milestone(
  p_referred_user_id UUID,
  p_milestone TEXT,
  p_property_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referral_record RECORD;
  reward_amount NUMERIC;
  reward_description TEXT;
BEGIN
  -- Find the referral record
  SELECT * INTO referral_record 
  FROM public.referrals 
  WHERE referred_user_id = p_referred_user_id 
  AND status != 'qualified';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update milestone based on type
  CASE p_milestone
    WHEN 'registered' THEN
      UPDATE public.referrals 
      SET registered_at = now(), 
          status = 'registered',
          updated_at = now()
      WHERE id = referral_record.id;
      
    WHEN 'approved' THEN
      UPDATE public.referrals 
      SET approved_at = now(), 
          status = 'approved',
          property_id = p_property_id,
          updated_at = now()
      WHERE id = referral_record.id;
      
    WHEN 'first_payment' THEN
      UPDATE public.referrals 
      SET first_payment_at = now(), 
          status = 'first_payment',
          updated_at = now()
      WHERE id = referral_record.id;
      
    WHEN 'sixty_day_milestone' THEN
      UPDATE public.referrals 
      SET sixty_day_milestone_at = now(), 
          status = 'qualified',
          updated_at = now()
      WHERE id = referral_record.id;
      
      -- Award $100 gift card for qualified referral
      INSERT INTO public.referral_rewards (
        user_id, referral_id, reward_type, reward_amount, 
        reward_description, status
      ) VALUES (
        referral_record.referrer_id, referral_record.id, 'gift_card', 100.00,
        '$100 Gift Card for Successful Referral', 'available'
      );
      
      -- Check if user has reached 5 qualified referrals for milestone bonus
      IF (SELECT COUNT(*) FROM public.referrals 
          WHERE referrer_id = referral_record.referrer_id 
          AND status = 'qualified') = 5 THEN
        
        INSERT INTO public.referral_rewards (
          user_id, referral_id, reward_type, reward_amount, 
          reward_description, status
        ) VALUES (
          referral_record.referrer_id, NULL, 'milestone_bonus', 250.00,
          '$250 Milestone Bonus for 5 Successful Referrals', 'available'
        );
      END IF;
      
    ELSE
      RETURN FALSE;
  END CASE;
  
  RETURN TRUE;
END;
$$;

-- Create function to get referral stats for a user
CREATE OR REPLACE FUNCTION public.get_referral_stats(p_user_id UUID)
RETURNS TABLE(
  total_referrals INTEGER,
  qualified_referrals INTEGER,
  pending_referrals INTEGER,
  total_rewards_earned NUMERIC,
  available_rewards_count INTEGER,
  progress_to_milestone INTEGER
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM public.referrals WHERE referrer_id = p_user_id),
    (SELECT COUNT(*)::INTEGER FROM public.referrals WHERE referrer_id = p_user_id AND status = 'qualified'),
    (SELECT COUNT(*)::INTEGER FROM public.referrals WHERE referrer_id = p_user_id AND status NOT IN ('qualified', 'expired')),
    COALESCE((SELECT SUM(reward_amount) FROM public.referral_rewards WHERE user_id = p_user_id), 0),
    (SELECT COUNT(*)::INTEGER FROM public.referral_rewards WHERE user_id = p_user_id AND status = 'available'),
    LEAST(5, (SELECT COUNT(*)::INTEGER FROM public.referrals WHERE referrer_id = p_user_id AND status = 'qualified'))
  FROM profiles 
  WHERE id = p_user_id;
END;
$$;

-- Create update trigger for referrals
CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();