-- Drop the existing function
DROP FUNCTION IF EXISTS get_comprehensive_admin_metrics();

-- Recreate the function with fixed column names
CREATE OR REPLACE FUNCTION get_comprehensive_admin_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'properties', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'by_status', (
          SELECT jsonb_object_agg(status, count)
          FROM (
            SELECT status, COUNT(*)::int as count
            FROM properties
            GROUP BY status
          ) s
        ),
        'by_type', (
          SELECT jsonb_object_agg(property_type, count)
          FROM (
            SELECT property_type, COUNT(*)::int as count
            FROM properties
            GROUP BY property_type
          ) t
        ),
        'average_rent', COALESCE(AVG(monthly_rent), 0),
        'occupancy_rate', CASE 
          WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'occupied')::float / COUNT(*)) * 100
          ELSE 0
        END,
        'vacancy_cost', COALESCE(SUM(CASE WHEN status = 'vacant' THEN monthly_rent ELSE 0 END), 0),
        'units_breakdown', (
          SELECT jsonb_build_object(
            'total_units', COALESCE(SUM(number_of_units), 0),
            'occupied_units', COALESCE(SUM(CASE WHEN status = 'occupied' THEN number_of_units ELSE 0 END), 0),
            'vacant_units', COALESCE(SUM(CASE WHEN status = 'vacant' THEN number_of_units ELSE 0 END), 0)
          )
        )
      )
      FROM properties
    ),
    'users', (
      SELECT jsonb_build_object(
        'landlords', COUNT(*) FILTER (WHERE user_type = 'landlord')::int,
        'tenants', COUNT(*) FILTER (WHERE user_type = 'tenant')::int,
        'total', COUNT(*)::int,
        'signups_this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::int,
        'signups_last_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE - interval '1 month') AND created_at < date_trunc('month', CURRENT_DATE))::int,
        'by_user_type', (
          SELECT jsonb_object_agg(user_type, count)
          FROM (
            SELECT user_type, COUNT(*)::int as count
            FROM profiles
            GROUP BY user_type
          ) u
        )
      )
      FROM profiles
    ),
    'applications', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'pending', COUNT(*) FILTER (WHERE status = 'pending')::int,
        'approved', COUNT(*) FILTER (WHERE status = 'approved')::int,
        'rejected', COUNT(*) FILTER (WHERE status = 'rejected')::int,
        'completed', COUNT(*) FILTER (WHERE status = 'completed')::int,
        'this_month', COUNT(*) FILTER (WHERE submitted_at >= date_trunc('month', CURRENT_DATE))::int,
        'approval_rate', CASE 
          WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'approved')::float / COUNT(*)) * 100
          ELSE 0
        END,
        'avg_processing_days', COALESCE(AVG(EXTRACT(day FROM (completed_date - submitted_at))) FILTER (WHERE completed_date IS NOT NULL), 0)
      )
      FROM property_applications
    ),
    'maintenance', (
      SELECT jsonb_build_object(
        'total_requests', COUNT(*)::int,
        'pending', COUNT(*) FILTER (WHERE status = 'pending')::int,
        'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress')::int,
        'completed', COUNT(*) FILTER (WHERE status = 'completed')::int,
        'avg_resolution_days', COALESCE(AVG(EXTRACT(day FROM (completed_at - created_at))) FILTER (WHERE completed_at IS NOT NULL), 0),
        'by_priority', (
          SELECT jsonb_object_agg(priority, count)
          FROM (
            SELECT priority, COUNT(*)::int as count
            FROM maintenance_requests
            GROUP BY priority
          ) p
        )
      )
      FROM maintenance_requests
    ),
    'financial', (
      SELECT jsonb_build_object(
        'total_rent_expected', COALESCE(SUM(amount), 0),
        'total_rent_collected', COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0),
        'pending_payments', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0),
        'overdue_payments', COALESCE(SUM(amount) FILTER (WHERE status = 'overdue'), 0),
        'collection_rate', CASE 
          WHEN SUM(amount) > 0 THEN (SUM(amount) FILTER (WHERE status = 'completed')::float / SUM(amount)) * 100
          ELSE 0
        END,
        'on_time_rate', CASE 
          WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'completed' AND payment_date <= due_date)::float / COUNT(*)) * 100
          ELSE 0
        END,
        'avg_days_late', COALESCE(AVG(EXTRACT(day FROM (payment_date - due_date))) FILTER (WHERE payment_date > due_date), 0)
      )
      FROM rent_payments
    ),
    'messages', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'unread', COUNT(*) FILTER (WHERE is_read = false)::int,
        'today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int,
        'this_week', COUNT(*) FILTER (WHERE created_at >= date_trunc('week', CURRENT_DATE))::int
      )
      FROM messages
    ),
    'portfolios', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'active', COUNT(*) FILTER (WHERE is_active = true)::int,
        'total_value', COALESCE(SUM(total_value), 0),
        'avg_properties_per_portfolio', COALESCE(AVG(property_count), 0)
      )
      FROM portfolios
    ),
    'referrals', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'successful', COUNT(*) FILTER (WHERE status = 'completed')::int,
        'pending', COUNT(*) FILTER (WHERE status = 'pending')::int,
        'conversion_rate', CASE 
          WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'completed')::float / COUNT(*)) * 100
          ELSE 0
        END
      )
      FROM referrals
    ),
    'points', (
      SELECT jsonb_build_object(
        'total_awarded', COALESCE(SUM(points), 0),
        'total_transactions', COUNT(*)::int,
        'avg_points_per_transaction', COALESCE(AVG(points), 0),
        'this_month', COALESCE(SUM(points) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0)
      )
      FROM point_transactions
    ),
    'matchmaker', (
      SELECT jsonb_build_object(
        'total_interactions', COUNT(*)::int,
        'total_likes', COUNT(*) FILTER (WHERE action_type = 'like')::int,
        'total_passes', COUNT(*) FILTER (WHERE action_type = 'pass')::int,
        'total_matches', (
          SELECT COUNT(DISTINCT CASE 
            WHEN ma1.action_type = 'like' AND ma2.action_type = 'like' 
            THEN LEAST(ma1.user_id::text, ma1.target_user_id::text) || '-' || GREATEST(ma1.user_id::text, ma1.target_user_id::text)
          END)::int
          FROM matchmaker_actions ma1
          JOIN matchmaker_actions ma2 ON ma1.user_id = ma2.target_user_id AND ma1.target_user_id = ma2.user_id
          WHERE ma1.action_type = 'like' AND ma2.action_type = 'like'
        ),
        'match_rate', CASE 
          WHEN COUNT(*) FILTER (WHERE action_type = 'like') > 0 THEN (
            (SELECT COUNT(DISTINCT CASE 
              WHEN ma1.action_type = 'like' AND ma2.action_type = 'like' 
              THEN LEAST(ma1.user_id::text, ma1.target_user_id::text) || '-' || GREATEST(ma1.user_id::text, ma1.target_user_id::text)
            END)::float
            FROM matchmaker_actions ma1
            JOIN matchmaker_actions ma2 ON ma1.user_id = ma2.target_user_id AND ma1.target_user_id = ma2.user_id
            WHERE ma1.action_type = 'like' AND ma2.action_type = 'like') / COUNT(*) FILTER (WHERE action_type = 'like')
          ) * 100
          ELSE 0
        END
      )
      FROM matchmaker_actions
    ),
    'subscriptions', (
      SELECT jsonb_build_object(
        'total_active', COUNT(*) FILTER (WHERE status = 'active')::int,
        'total_cancelled', COUNT(*) FILTER (WHERE status = 'cancelled')::int,
        'total_expired', COUNT(*) FILTER (WHERE status = 'expired')::int,
        'by_tier', (
          SELECT jsonb_object_agg(tier, count)
          FROM (
            SELECT tier, COUNT(*)::int as count
            FROM subscriptions
            WHERE status = 'active'
            GROUP BY tier
          ) t
        ),
        'mrr', COALESCE(SUM(price) FILTER (WHERE status = 'active' AND billing_interval = 'monthly'), 0),
        'arr', COALESCE(SUM(price * 12) FILTER (WHERE status = 'active' AND billing_interval = 'monthly'), 0) + COALESCE(SUM(price) FILTER (WHERE status = 'active' AND billing_interval = 'yearly'), 0)
      )
      FROM subscriptions
    )
  ) INTO result;

  RETURN result;
END;
$$;