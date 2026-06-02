-- Fix has_multiple_units column reference in get_comprehensive_admin_metrics
DROP FUNCTION IF EXISTS get_comprehensive_admin_metrics();

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
      'active', (SELECT COUNT(*)::int FROM properties WHERE status = 'active'),
      'occupied', (SELECT COUNT(*)::int FROM properties WHERE status = 'occupied'),
      'maintenance', (SELECT COUNT(*)::int FROM properties WHERE status = 'maintenance'),
      'vacant', (SELECT COUNT(*)::int FROM properties WHERE status = 'vacant'),
      'average_rent', (SELECT COALESCE(AVG(rent_amount), 0)::numeric(10,2) FROM properties WHERE rent_amount IS NOT NULL),
      'total_units', (SELECT COALESCE(SUM(unit_count), 0)::int FROM properties),
      'occupied_units', (SELECT COALESCE(SUM(unit_count), 0)::int FROM properties WHERE status = 'occupied'),
      'types', (
        SELECT jsonb_object_agg(property_type, count)
        FROM (
          SELECT property_type, COUNT(*)::int as count
          FROM properties
          WHERE property_type IS NOT NULL
          GROUP BY property_type
        ) t
      ),
      'units_breakdown', (
        SELECT jsonb_object_agg(has_units, count)
        FROM (
          SELECT 
            CASE WHEN unit_count > 1 THEN 'multi_unit' ELSE 'single_unit' END as has_units,
            COUNT(*)::int as count
          FROM properties
          GROUP BY (unit_count > 1)
        ) u
      )
    ),
    'users', jsonb_build_object(
      'total', (SELECT COUNT(*)::int FROM profiles),
      'landlords', (SELECT COUNT(*)::int FROM profiles WHERE user_type = 'landlord'),
      'tenants', (SELECT COUNT(*)::int FROM profiles WHERE user_type = 'tenant'),
      'new_this_month', (
        SELECT COUNT(*)::int FROM profiles 
        WHERE created_at >= date_trunc('month', CURRENT_DATE)
      ),
      'signup_trend', (
        SELECT jsonb_agg(jsonb_build_object(
          'month', to_char(month, 'Mon YYYY'),
          'count', count
        ) ORDER BY month DESC)
        FROM (
          SELECT 
            date_trunc('month', created_at) as month,
            COUNT(*)::int as count
          FROM profiles
          WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
          GROUP BY date_trunc('month', created_at)
          ORDER BY month DESC
          LIMIT 6
        ) monthly
      )
    ),
    'applications', jsonb_build_object(
      'total', (SELECT COUNT(*)::int FROM rental_applications),
      'pending', (SELECT COUNT(*)::int FROM rental_applications WHERE status = 'pending'),
      'approved', (SELECT COUNT(*)::int FROM rental_applications WHERE status = 'approved'),
      'rejected', (SELECT COUNT(*)::int FROM rental_applications WHERE status = 'rejected')
    ),
    'maintenance', jsonb_build_object(
      'total', (SELECT COUNT(*)::int FROM maintenance_requests),
      'open', (SELECT COUNT(*)::int FROM maintenance_requests WHERE status = 'open'),
      'in_progress', (SELECT COUNT(*)::int FROM maintenance_requests WHERE status = 'in_progress'),
      'completed', (SELECT COUNT(*)::int FROM maintenance_requests WHERE status = 'completed'),
      'average_resolution_days', (
        SELECT COALESCE(AVG(EXTRACT(DAY FROM (completed_at - created_at))), 0)::numeric(10,1)
        FROM maintenance_requests
        WHERE status = 'completed' AND completed_at IS NOT NULL
      )
    ),
    'financials', jsonb_build_object(
      'total_rent_collected', (
        SELECT COALESCE(SUM(amount), 0)::numeric(10,2)
        FROM rent_payments
        WHERE status = 'paid'
      ),
      'pending_payments', (
        SELECT COALESCE(SUM(amount), 0)::numeric(10,2)
        FROM rent_payments
        WHERE status = 'pending'
      ),
      'overdue_payments', (
        SELECT COALESCE(SUM(amount), 0)::numeric(10,2)
        FROM rent_payments
        WHERE status = 'overdue'
      ),
      'collection_rate', (
        SELECT CASE 
          WHEN COALESCE(SUM(amount), 0) = 0 THEN 0
          ELSE (
            COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) * 100.0 / 
            COALESCE(SUM(amount), 1)
          )::numeric(5,2)
        END
        FROM rent_payments
      ),
      'on_time_rate', (
        SELECT CASE 
          WHEN COUNT(*) = 0 THEN 0
          ELSE (
            COUNT(CASE WHEN status = 'paid' AND paid_at <= due_date THEN 1 END) * 100.0 / 
            COUNT(*)
          )::numeric(5,2)
        END
        FROM rent_payments
        WHERE status = 'paid'
      ),
      'late_payments', (
        SELECT COUNT(*)::int
        FROM rent_payments
        WHERE status = 'paid' AND paid_at > due_date
      ),
      'avg_days_late', (
        SELECT COALESCE(AVG(EXTRACT(DAY FROM (paid_at - due_date))), 0)::numeric(10,1)
        FROM rent_payments
        WHERE status = 'paid' AND paid_at > due_date
      )
    ),
    'messages', jsonb_build_object(
      'total', (SELECT COUNT(*)::int FROM messages),
      'unread', (SELECT COUNT(*)::int FROM messages WHERE read = false),
      'by_user_type', (
        SELECT jsonb_object_agg(sender_type, count)
        FROM (
          SELECT 
            COALESCE(p.user_type::text, 'unknown') as sender_type,
            COUNT(*)::int as count
          FROM messages m
          LEFT JOIN profiles p ON m.sender_id = p.id
          GROUP BY p.user_type
        ) msg
      )
    ),
    'portfolios', jsonb_build_object(
      'total', (SELECT COUNT(*)::int FROM portfolios),
      'total_assets', (SELECT COALESCE(SUM(total_properties), 0)::int FROM portfolios),
      'avg_properties_per_portfolio', (
        SELECT COALESCE(AVG(total_properties), 0)::numeric(10,1)
        FROM portfolios
      )
    ),
    'referrals', jsonb_build_object(
      'total', (SELECT COUNT(*)::int FROM referrals),
      'successful', (SELECT COUNT(*)::int FROM referrals WHERE status = 'successful'),
      'pending', (SELECT COUNT(*)::int FROM referrals WHERE status = 'pending')
    ),
    'points', jsonb_build_object(
      'total_distributed', (SELECT COALESCE(SUM(points), 0)::int FROM user_points),
      'total_redeemed', (SELECT COALESCE(SUM(points_redeemed), 0)::int FROM user_points)
    ),
    'matchmaker', jsonb_build_object(
      'total_connections', (SELECT COUNT(*)::int FROM matchmaker_connections),
      'active_connections', (SELECT COUNT(*)::int FROM matchmaker_connections WHERE status = 'active'),
      'successful_matches', (SELECT COUNT(*)::int FROM matchmaker_connections WHERE status = 'matched'),
      'avg_match_score', (
        SELECT COALESCE(AVG(compatibility_score), 0)::numeric(5,2)
        FROM matchmaker_connections
        WHERE compatibility_score IS NOT NULL
      ),
      'recent_activity', (
        SELECT jsonb_agg(jsonb_build_object(
          'date', date,
          'connections', connections,
          'matches', matches
        ) ORDER BY date DESC)
        FROM (
          SELECT 
            date_trunc('day', created_at)::date as date,
            COUNT(*)::int as connections,
            COUNT(CASE WHEN status = 'matched' THEN 1 END)::int as matches
          FROM matchmaker_connections
          WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY date_trunc('day', created_at)::date
          ORDER BY date DESC
          LIMIT 7
        ) activity
      )
    ),
    'subscriptions', jsonb_build_object(
      'total', (SELECT COUNT(*)::int FROM subscriptions),
      'active', (SELECT COUNT(*)::int FROM subscriptions WHERE status = 'active'),
      'inactive', (SELECT COUNT(*)::int FROM subscriptions WHERE status IN ('cancelled', 'expired', 'suspended')),
      'trial', (SELECT COUNT(*)::int FROM subscriptions WHERE status = 'trial'),
      'autopay_enabled', (SELECT COUNT(*)::int FROM subscriptions WHERE autopay_enabled = true),
      'total_units', (SELECT COALESCE(SUM(number_of_units), 0)::int FROM subscriptions),
      'by_plan_type', (
        SELECT jsonb_object_agg(plan_type, count)
        FROM (
          SELECT 
            COALESCE(plan_type, 'unknown') as plan_type,
            COUNT(*)::int as count
          FROM subscriptions
          GROUP BY plan_type
        ) plans
      ),
      'by_status', (
        SELECT jsonb_object_agg(status, count)
        FROM (
          SELECT 
            status,
            COUNT(*)::int as count
          FROM subscriptions
          GROUP BY status
        ) statuses
      )
    )
  ) INTO result;
  
  RETURN result;
END;
$$;