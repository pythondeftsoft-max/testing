
-- Phase 1: Backend Harmonization - Add fields to track point equivalents and migration status

-- Add fields to referral_rewards table to track point equivalents
ALTER TABLE public.referral_rewards 
ADD COLUMN IF NOT EXISTS migrated_to_points boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS equivalent_points integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS conversion_rate numeric DEFAULT 100.0; -- 100 points = $1

-- Update existing records to calculate point equivalents
UPDATE public.referral_rewards 
SET equivalent_points = (reward_amount * conversion_rate)::integer,
    conversion_rate = 100.0
WHERE equivalent_points IS NULL;

-- Create function to get unified referral value (points + gift cards)
CREATE OR REPLACE FUNCTION public.get_unified_referral_value(p_user_id uuid)
RETURNS TABLE(
  total_gift_card_value numeric,
  total_point_equivalent integer,
  total_unified_points integer,
  available_gift_cards integer,
  available_point_equivalent integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN rr.status = 'available' THEN rr.reward_amount ELSE 0 END), 0) as total_gift_card_value,
    COALESCE(SUM(CASE WHEN rr.status = 'available' THEN rr.equivalent_points ELSE 0 END), 0) as total_point_equivalent,
    COALESCE(SUM(rr.equivalent_points), 0) + COALESCE(ph.total_referral_points, 0) as total_unified_points,
    COUNT(CASE WHEN rr.status = 'available' THEN 1 END)::integer as available_gift_cards,
    COALESCE(SUM(CASE WHEN rr.status = 'available' THEN rr.equivalent_points ELSE 0 END), 0) as available_point_equivalent
  FROM public.referral_rewards rr
  LEFT JOIN (
    SELECT user_id, SUM(points_change) as total_referral_points
    FROM public.points_history 
    WHERE event_type LIKE '%referral%'
    GROUP BY user_id
  ) ph ON ph.user_id = p_user_id
  WHERE rr.user_id = p_user_id;
END;
$$;

-- Enhanced referral stats function to include point equivalents
CREATE OR REPLACE FUNCTION public.get_enhanced_referral_stats(p_user_id uuid)
RETURNS TABLE(
  total_referrals integer, 
  qualified_referrals integer, 
  pending_referrals integer, 
  total_rewards_earned numeric, 
  available_rewards_count integer, 
  progress_to_milestone integer,
  total_point_equivalent integer,
  available_point_equivalent integer,
  unified_total_value integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH referral_counts AS (
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'invitation_sent' THEN 1 END) as pending,
      COUNT(CASE WHEN status = 'registered' THEN 1 END) as registered,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
      COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified
    FROM public.referrals 
    WHERE referrer_id = p_user_id
  ),
  reward_stats AS (
    SELECT 
      COALESCE(SUM(reward_amount), 0) as total_earned,
      COUNT(CASE WHEN status = 'available' THEN 1 END) as available_count,
      COALESCE(SUM(equivalent_points), 0) as total_points,
      COALESCE(SUM(CASE WHEN status = 'available' THEN equivalent_points ELSE 0 END), 0) as available_points
    FROM public.referral_rewards 
    WHERE user_id = p_user_id
  ),
  points_stats AS (
    SELECT COALESCE(SUM(points_change), 0) as referral_points
    FROM public.points_history 
    WHERE user_id = p_user_id AND event_type LIKE '%referral%'
  )
  SELECT 
    rc.total::INTEGER,
    rc.pending::INTEGER + rc.registered::INTEGER + rc.approved::INTEGER,
    rc.qualified::INTEGER,
    rs.total_earned::NUMERIC,
    rs.available_count::INTEGER,
    LEAST(5, rc.qualified::INTEGER),
    rs.total_points::INTEGER,
    rs.available_points::INTEGER,
    (rs.total_points + ps.referral_points)::INTEGER as unified_total
  FROM referral_counts rc
  CROSS JOIN reward_stats rs
  CROSS JOIN points_stats ps;
END;
$$;

-- Function to award unified referral points (replaces separate gift card logic)
CREATE OR REPLACE FUNCTION public.award_unified_referral_points(
  p_user_id uuid,
  p_referral_id uuid,
  p_base_amount numeric DEFAULT 100.00,
  p_award_type text DEFAULT 'referral_completion'
)
RETURNS TABLE(points_awarded integer, gift_card_created boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_points_equivalent integer;
  v_conversion_rate numeric := 100.0; -- 100 points = $1
BEGIN
  -- Calculate point equivalent
  v_points_equivalent := (p_base_amount * v_conversion_rate)::integer;
  
  -- Award points through existing system
  PERFORM public.award_points(
    p_user_id := p_user_id,
    p_event_type := p_award_type,
    p_points_change := v_points_equivalent,
    p_notes := format('Referral reward: $%.2f equivalent (%s points)', p_base_amount, v_points_equivalent),
    p_related_entity_id := p_referral_id,
    p_related_entity_type := 'referral'
  );
  
  -- Also create gift card record for backward compatibility and user preference
  INSERT INTO public.referral_rewards (
    user_id, 
    referral_id, 
    reward_type, 
    reward_amount, 
    reward_description, 
    status,
    equivalent_points,
    conversion_rate
  ) VALUES (
    p_user_id,
    p_referral_id,
    'gift_card',
    p_base_amount,
    format('$%.2f Gift Card for Successful Referral', p_base_amount),
    'available',
    v_points_equivalent,
    v_conversion_rate
  );
  
  RETURN QUERY SELECT v_points_equivalent, true;
END;
$$;
