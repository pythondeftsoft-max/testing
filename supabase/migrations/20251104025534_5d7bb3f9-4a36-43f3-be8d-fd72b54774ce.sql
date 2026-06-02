-- Drop the existing function first
DROP FUNCTION IF EXISTS get_comprehensive_admin_metrics();

-- Recreate with fixed enum handling
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
      'total', (SELECT COUNT(*) FROM properties),
      'by_status', (
        SELECT jsonb_object_agg(COALESCE(status::text, 'unknown'), count)
        FROM (
          SELECT status, COUNT(*)::int as count
          FROM properties
          GROUP BY status
        ) s
      ),
      'by_type', (
        SELECT jsonb_object_agg(COALESCE(property_type::text, 'unknown'), count)
        FROM (
          SELECT property_type, COUNT(*)::int as count
          FROM properties
          GROUP BY property_type
        ) t
      ),
      'average_rent', COALESCE((SELECT AVG(monthly_rent) FROM properties WHERE monthly_rent IS NOT NULL), 0)
    ),
    'users', jsonb_build_object(
      'landlords', (SELECT COUNT(*) FROM profiles WHERE role::text = 'landlord'),
      'tenants', (SELECT COUNT(*) FROM profiles WHERE role::text = 'tenant'),
      'total', (SELECT COUNT(*) FROM profiles)
    ),
    'applications', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM rental_applications),
      'by_status', (
        SELECT jsonb_object_agg(COALESCE(status::text, 'unknown'), count)
        FROM (
          SELECT status, COUNT(*)::int as count
          FROM rental_applications
          GROUP BY status
        ) s
      ),
      'this_month', (
        SELECT COUNT(*) 
        FROM rental_applications 
        WHERE created_at >= date_trunc('month', CURRENT_DATE)
      )
    ),
    'maintenance', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM maintenance_requests),
      'by_status', (
        SELECT jsonb_object_agg(COALESCE(status::text, 'unknown'), count)
        FROM (
          SELECT status, COUNT(*)::int as count
          FROM maintenance_requests
          GROUP BY status
        ) s
      ),
      'by_priority', (
        SELECT jsonb_object_agg(COALESCE(priority::text, 'unknown'), count)
        FROM (
          SELECT priority, COUNT(*)::int as count
          FROM maintenance_requests
          GROUP BY priority
        ) p
      ),
      'avg_completion_days', (
        SELECT AVG(EXTRACT(DAY FROM (completed_at - created_at)))
        FROM maintenance_requests
        WHERE completed_at IS NOT NULL
      )
    ),
    'financial', jsonb_build_object(
      'total_collected', COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE status::text = 'completed'
      ), 0),
      'total_pending', COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE status::text = 'pending'
      ), 0),
      'total_late', COALESCE((
        SELECT SUM(amount) 
        FROM payments 
        WHERE status::text = 'late'
      ), 0),
      'payment_count', (SELECT COUNT(*) FROM payments),
      'collection_rate', CASE 
        WHEN (SELECT SUM(amount) FROM payments WHERE status::text IN ('completed', 'pending', 'late')) > 0 
        THEN (
          SELECT (SUM(CASE WHEN status::text = 'completed' THEN amount ELSE 0 END) * 100.0 / 
                  SUM(amount))
          FROM payments 
          WHERE status::text IN ('completed', 'pending', 'late')
        )
        ELSE 0 
      END
    ),
    'messages', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM messages),
      'this_month', (
        SELECT COUNT(*) 
        FROM messages 
        WHERE created_at >= date_trunc('month', CURRENT_DATE)
      ),
      'by_sender_role', (
        SELECT jsonb_object_agg(COALESCE(p.role::text, 'unknown'), count)
        FROM (
          SELECT p.role, COUNT(m.*)::int as count
          FROM messages m
          LEFT JOIN profiles p ON m.sender_id = p.id
          GROUP BY p.role
        ) p
      )
    ),
    'portfolios', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM portfolios),
      'total_assets', (SELECT COUNT(*) FROM portfolio_assets),
      'avg_properties', (
        SELECT AVG(property_count)
        FROM (
          SELECT COUNT(*) as property_count
          FROM portfolio_properties
          GROUP BY portfolio_id
        ) pc
      )
    ),
    'referrals', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM referrals),
      'by_status', (
        SELECT jsonb_object_agg(COALESCE(status::text, 'unknown'), count)
        FROM (
          SELECT status, COUNT(*)::int as count
          FROM referrals
          GROUP BY status
        ) s
      ),
      'conversion_rate', CASE 
        WHEN (SELECT COUNT(*) FROM referrals) > 0 
        THEN (
          SELECT (COUNT(CASE WHEN status::text = 'completed' THEN 1 END) * 100.0 / COUNT(*))
          FROM referrals
        )
        ELSE 0 
      END
    ),
    'points', jsonb_build_object(
      'total_distributed', COALESCE((SELECT SUM(points_earned) FROM user_points), 0),
      'active_users', (
        SELECT COUNT(DISTINCT user_id) 
        FROM user_points 
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      ),
      'this_month', COALESCE((
        SELECT SUM(points_earned) 
        FROM user_points 
        WHERE created_at >= date_trunc('month', CURRENT_DATE)
      ), 0)
    ),
    'matchmaker', jsonb_build_object(
      'total_interactions', (SELECT COUNT(*) FROM tenant_matchmaker_interactions),
      'this_month', (
        SELECT COUNT(*) 
        FROM tenant_matchmaker_interactions 
        WHERE created_at >= date_trunc('month', CURRENT_DATE)
      )
    )
  ) INTO result;
  
  RETURN result;
END;
$$;