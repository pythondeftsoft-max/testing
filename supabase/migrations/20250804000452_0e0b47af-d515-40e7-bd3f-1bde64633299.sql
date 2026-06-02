
-- Fix the get_unified_referral_value function GROUP BY clause issue
CREATE OR REPLACE FUNCTION public.get_unified_referral_value(p_user_id uuid)
 RETURNS TABLE(total_gift_card_value numeric, total_point_equivalent integer, total_unified_points integer, available_gift_cards integer, available_point_equivalent integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  WITH reward_stats AS (
    SELECT 
      COALESCE(SUM(CASE WHEN rr.status = 'available' THEN rr.reward_amount ELSE 0 END), 0) as total_gift_card_value,
      COALESCE(SUM(CASE WHEN rr.status = 'available' THEN rr.equivalent_points ELSE 0 END), 0) as total_point_equivalent,
      COALESCE(SUM(rr.equivalent_points), 0) as total_reward_points,
      COUNT(CASE WHEN rr.status = 'available' THEN 1 END)::integer as available_gift_cards,
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
    rs.total_gift_card_value::numeric,
    rs.total_point_equivalent::integer,
    (rs.total_reward_points + ps.total_referral_points)::integer as total_unified_points,
    rs.available_gift_cards::integer,
    rs.available_point_equivalent::integer
  FROM reward_stats rs
  CROSS JOIN points_stats ps;
END;
$function$

-- Add a policy to ensure tenants can view available properties
DROP POLICY IF EXISTS "Anyone can browse available properties" ON public.properties;
CREATE POLICY "Anyone can browse available properties" 
  ON public.properties 
  FOR SELECT 
  USING (status = 'available');

-- Ensure property units are visible with their properties
DROP POLICY IF EXISTS "Property units visible with properties" ON public.property_units;
CREATE POLICY "Property units visible with properties" 
  ON public.property_units 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.properties 
    WHERE id = property_units.property_id 
    AND status = 'available'
  ));
