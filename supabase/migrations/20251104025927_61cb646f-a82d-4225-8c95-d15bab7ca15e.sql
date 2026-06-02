-- Drop the existing function
DROP FUNCTION IF EXISTS get_comprehensive_admin_metrics();

-- Recreate the function with correct column name (user_type instead of role)
CREATE OR REPLACE FUNCTION get_comprehensive_admin_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'properties', jsonb_build_object(
      'total', (SELECT COUNT(*)::int FROM properties),
      'by_status', (
        SELECT jsonb_object_agg(COALESCE(status::text, 'unknown'), count)
        FROM (
          SELECT status, COUNT(*)::int as count
          FROM properties
          GROUP BY status
        ) t
      ),
      'by_type', (
        SELECT jsonb_object_agg(COALESCE(property_type::text, 'unknown'), count)
        FROM (
          SELECT property_type, COUNT(*)::int as count
          FROM properties
          GROUP BY property_type
        ) t
      ),
      'average_rent', COALESCE((SELECT AVG(rent_amount) FROM properties WHERE rent_amount IS NOT NULL), 0)
    ),
    'users', jsonb_build_object(
      'landlords', (SELECT COUNT(*) FROM profiles WHERE user_type::text = 'landlord'),
      'tenants', (SELECT COUNT(*) FROM profiles WHERE user_type::text = 'tenant'),
      'total', (SELECT COUNT(*) FROM profiles)
    ),
    'applications', jsonb_build_object(
      'total', (SELECT COUNT(*)::int FROM applications),
      'by_status', (
        SELECT jsonb_object_agg(COALESCE(status::text, 'unknown'), count)
        FROM (
          SELECT status, COUNT(*)::int as count
          FROM applications
          GROUP BY status
        ) t
      ),
      'this_month', (
        SELECT COUNT(*)::int FROM applications 
        WHERE created_at >= date_trunc('month', CURRENT_DATE)
      )
    ),
    'maintenance', jsonb_build_object(
      'total', (SELECT COUNT(*)::int FROM maintenance_requests),
      'by_status', (
        SELECT jsonb_object_agg(COALESCE(status::text, 'unknown'), count)
        FROM (
          SELECT status, COUNT(*)::int as count
          FROM maintenance_requests
          GROUP BY status
        ) t
      ),
      'by_priority', (
        SELECT jsonb_object_agg(COALESCE(priority::text, 'unknown'), count)
        FROM (
          SELECT priority, COUNT(*)::int as count
          FROM maintenance_requests
          GROUP BY priority
        ) t
      ),
      'avg_completion_days', (
        SELECT AVG(EXTRACT(day FROM (completed_at - created_at)))
        FROM maintenance_requests
        WHERE completed_at IS NOT NULL
      )
    ),
    'financial', jsonb_build_object(
      'total_collected', COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed'), 0),
      'total_pending', COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'pending'), 0),
      'total_late', COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'overdue'), 0),
      'payment_count', (SELECT COUNT(*)::int FROM payments),
      'collection_rate', CASE 
        WHEN (SELECT SUM(amount) FROM payments WHERE status IN ('completed', 'pending', 'overdue')) > 0
        THEN ((SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') / 
              (SELECT SUM(amount) FROM payments WHERE status IN ('completed', 'pending', 'overdue'))) * 100
        ELSE 0
      END
    ),
    'messages', jsonb_build_object(
      'total', (SELECT COUNT(*)::int FROM messages),
      'this_month', (
        SELECT COUNT(*)::int FROM messages 
        WHERE created_at >= date_trunc('month', CURRENT_DATE)
      ),
      'by_sender_role', (
        SELECT jsonb_object_agg(COALESCE(user_type::text, 'unknown'), count)
        FROM (
          SELECT p.user_type, COUNT(m.*)::int as count
          FROM messages m
          LEFT JOIN profiles p ON m.sender_id = p.id
          GROUP BY p.user_type
        ) t
      )
    ),
    'portfolios', jsonb_build_object(
      'total', (SELECT COUNT(*)::int FROM portfolios),
      'total_assets', COALESCE((SELECT SUM(total_assets) FROM portfolios), 0),
      'avg_properties', (
        SELECT AVG(property_count)
        FROM (
          SELECT COUNT(*) as property_count
          FROM properties
          GROUP BY portfolio_id
        ) t
      )
    ),
    'referrals', jsonb_build_object(
      'total', (SELECT COUNT(*)::int FROM referrals),
      'by_status', (
        SELECT jsonb_object_agg(COALESCE(status::text, 'unknown'), count)
        FROM (
          SELECT status, COUNT(*)::int as count
          FROM referrals
          GROUP BY status
        ) t
      ),
      'conversion_rate', CASE 
        WHEN (SELECT COUNT(*) FROM referrals) > 0
        THEN ((SELECT COUNT(*)::float FROM referrals WHERE status = 'completed') / 
              (SELECT COUNT(*) FROM referrals)) * 100
        ELSE 0
      END
    ),
    'points', jsonb_build_object(
      'total_distributed', COALESCE((SELECT SUM(points_earned) FROM loyalty_transactions), 0),
      'active_users', (SELECT COUNT(DISTINCT user_id)::int FROM loyalty_transactions),
      'this_month', COALESCE(
        (SELECT SUM(points_earned) FROM loyalty_transactions 
         WHERE created_at >= date_trunc('month', CURRENT_DATE)), 
        0
      )
    ),
    'matchmaker', jsonb_build_object(
      'total_interactions', (SELECT COUNT(*)::int FROM matchmaker_interactions),
      'this_month', (
        SELECT COUNT(*)::int FROM matchmaker_interactions 
        WHERE created_at >= date_trunc('month', CURRENT_DATE)
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;