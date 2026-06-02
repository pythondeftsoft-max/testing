-- Create comprehensive admin metrics function
CREATE OR REPLACE FUNCTION get_comprehensive_admin_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'properties', (
      SELECT json_build_object(
        'total', COUNT(*),
        'by_status', (
          SELECT json_object_agg(status, count)
          FROM (
            SELECT COALESCE(status, 'unknown') as status, COUNT(*) as count
            FROM properties
            GROUP BY status
          ) s
        ),
        'by_type', (
          SELECT json_object_agg(property_type, count)
          FROM (
            SELECT COALESCE(property_type, 'unknown') as property_type, COUNT(*) as count
            FROM properties
            GROUP BY property_type
          ) t
        ),
        'average_rent', COALESCE(AVG(rent_amount), 0)
      )
      FROM properties
    ),
    'users', (
      SELECT json_build_object(
        'landlords', (SELECT COUNT(*) FROM profiles WHERE role = 'landlord'),
        'tenants', (SELECT COUNT(*) FROM profiles WHERE role = 'tenant'),
        'total', COUNT(*)
      )
      FROM profiles
    ),
    'applications', (
      SELECT json_build_object(
        'total', COUNT(*),
        'by_status', (
          SELECT json_object_agg(status, count)
          FROM (
            SELECT COALESCE(status, 'unknown') as status, COUNT(*) as count
            FROM applications
            GROUP BY status
          ) s
        ),
        'this_month', (
          SELECT COUNT(*) 
          FROM applications 
          WHERE created_at >= date_trunc('month', CURRENT_DATE)
        )
      )
      FROM applications
    ),
    'maintenance', (
      SELECT json_build_object(
        'total', COUNT(*),
        'by_status', (
          SELECT json_object_agg(status, count)
          FROM (
            SELECT COALESCE(status, 'unknown') as status, COUNT(*) as count
            FROM maintenance_requests
            GROUP BY status
          ) s
        ),
        'by_priority', (
          SELECT json_object_agg(priority, count)
          FROM (
            SELECT COALESCE(priority, 'unknown') as priority, COUNT(*) as count
            FROM maintenance_requests
            GROUP BY priority
          ) p
        ),
        'avg_completion_days', (
          SELECT AVG(EXTRACT(DAY FROM (completed_at - created_at)))
          FROM maintenance_requests
          WHERE completed_at IS NOT NULL
        )
      )
      FROM maintenance_requests
    ),
    'financial', (
      SELECT json_build_object(
        'total_collected', COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0),
        'total_pending', COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0),
        'total_late', COALESCE(SUM(CASE WHEN status = 'late' THEN amount ELSE 0 END), 0),
        'payment_count', COUNT(*),
        'collection_rate', (
          CASE 
            WHEN COUNT(*) > 0 
            THEN ROUND((COUNT(*) FILTER (WHERE status = 'paid')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
          END
        )
      )
      FROM rent_payments
    ),
    'messages', (
      SELECT json_build_object(
        'total', COUNT(*),
        'this_month', (
          SELECT COUNT(*) 
          FROM messages 
          WHERE created_at >= date_trunc('month', CURRENT_DATE)
        ),
        'by_sender_role', (
          SELECT json_object_agg(role, count)
          FROM (
            SELECT COALESCE(p.role, 'unknown') as role, COUNT(*) as count
            FROM messages m
            LEFT JOIN profiles p ON m.sender_id = p.id
            GROUP BY p.role
          ) r
        )
      )
      FROM messages
    ),
    'portfolios', (
      SELECT json_build_object(
        'total', COUNT(*),
        'total_assets', COALESCE(SUM((SELECT COUNT(*) FROM portfolio_assets pa WHERE pa.portfolio_id = portfolios.id)), 0),
        'avg_properties', (
          SELECT AVG(property_count)
          FROM (
            SELECT COUNT(*) as property_count
            FROM properties
            GROUP BY portfolio_id
          ) pc
        )
      )
      FROM portfolios
    ),
    'referrals', (
      SELECT json_build_object(
        'total', COUNT(*),
        'by_status', (
          SELECT json_object_agg(status, count)
          FROM (
            SELECT COALESCE(status, 'unknown') as status, COUNT(*) as count
            FROM referrals
            GROUP BY status
          ) s
        ),
        'conversion_rate', (
          CASE 
            WHEN COUNT(*) > 0 
            THEN ROUND((COUNT(*) FILTER (WHERE status = 'qualified')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
            ELSE 0
          END
        )
      )
      FROM referrals
    ),
    'points', (
      SELECT json_build_object(
        'total_distributed', COALESCE(SUM(points_change), 0),
        'active_users', COUNT(DISTINCT user_id),
        'this_month', (
          SELECT COALESCE(SUM(points_change), 0)
          FROM points_history
          WHERE created_at >= date_trunc('month', CURRENT_DATE)
        )
      )
      FROM points_history
      WHERE points_change > 0
    ),
    'matchmaker', (
      SELECT json_build_object(
        'total_interactions', COUNT(*),
        'this_month', (
          SELECT COUNT(*)
          FROM matchmaker_stats
          WHERE created_at >= date_trunc('month', CURRENT_DATE)
        )
      )
      FROM matchmaker_stats
    )
  ) INTO result;
  
  RETURN result;
END;
$$;