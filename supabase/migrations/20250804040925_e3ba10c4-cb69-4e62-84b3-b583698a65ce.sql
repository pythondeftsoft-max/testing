-- Fix get_unified_referral_value function to handle GROUP BY issues
CREATE OR REPLACE FUNCTION public.get_unified_referral_value(p_user_id uuid)
 RETURNS TABLE(total_gift_card_value numeric, total_point_equivalent integer, total_unified_points integer, available_gift_cards integer, available_point_equivalent integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH referral_stats AS (
    SELECT 
      COALESCE(SUM(CASE WHEN rr.status = 'available' THEN rr.reward_amount ELSE 0 END), 0) as total_gift_card_value,
      COALESCE(SUM(CASE WHEN rr.status = 'available' THEN rr.equivalent_points ELSE 0 END), 0) as total_point_equivalent,
      COALESCE(SUM(rr.equivalent_points), 0) as total_equivalent_points,
      COUNT(CASE WHEN rr.status = 'available' THEN 1 END) as available_gift_cards,
      COALESCE(SUM(CASE WHEN rr.status = 'available' THEN rr.equivalent_points ELSE 0 END), 0) as available_point_equivalent
    FROM public.referral_rewards rr
    WHERE rr.user_id = p_user_id
  ),
  points_stats AS (
    SELECT COALESCE(SUM(points_change), 0) as total_referral_points
    FROM public.points_history 
    WHERE user_id = p_user_id AND event_type LIKE '%referral%'
  )
  SELECT 
    rs.total_gift_card_value::NUMERIC,
    rs.total_point_equivalent::INTEGER,
    (rs.total_equivalent_points + ps.total_referral_points)::INTEGER as total_unified_points,
    rs.available_gift_cards::INTEGER,
    rs.available_point_equivalent::INTEGER
  FROM referral_stats rs
  CROSS JOIN points_stats ps;
END;
$function$;

-- Fix get_enhanced_referral_stats function to handle empty data properly
CREATE OR REPLACE FUNCTION public.get_enhanced_referral_stats(p_user_id uuid)
 RETURNS TABLE(total_referrals integer, qualified_referrals integer, pending_referrals integer, total_rewards_earned numeric, available_rewards_count integer, progress_to_milestone integer, total_point_equivalent integer, available_point_equivalent integer, unified_total_value integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
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
    COALESCE(rc.total, 0)::INTEGER,
    COALESCE(rc.qualified, 0)::INTEGER,
    COALESCE((rc.pending + rc.registered + rc.approved), 0)::INTEGER,
    rs.total_earned::NUMERIC,
    rs.available_count::INTEGER,
    LEAST(5, COALESCE(rc.qualified, 0)::INTEGER),
    rs.total_points::INTEGER,
    rs.available_points::INTEGER,
    (rs.total_points + ps.referral_points)::INTEGER as unified_total
  FROM referral_counts rc
  CROSS JOIN reward_stats rs
  CROSS JOIN points_stats ps;
END;
$function$;