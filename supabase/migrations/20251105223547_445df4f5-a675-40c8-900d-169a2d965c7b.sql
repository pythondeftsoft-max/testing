-- Fix the get_referrals_recent_activity_admin function to use CONCAT instead of non-existent full_name
DROP FUNCTION IF EXISTS get_referrals_recent_activity_admin(INT);

CREATE OR REPLACE FUNCTION get_referrals_recent_activity_admin(limit_count INT DEFAULT 20)
RETURNS TABLE (
  referral_id UUID,
  referrer_id UUID,
  referrer_name TEXT,
  referred_name TEXT,
  referred_email TEXT,
  referred_user_id UUID,
  status TEXT,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as referral_id,
    r.referrer_id,
    CONCAT(p.first_name, ' ', p.last_name) as referrer_name,
    r.referred_name,
    r.referred_email,
    r.referred_user_id,
    r.status,
    r.updated_at
  FROM referrals r
  LEFT JOIN profiles p ON p.id = r.referrer_id
  ORDER BY r.updated_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;