-- Drop the existing function
DROP FUNCTION IF EXISTS get_comprehensive_admin_metrics();

-- Recreate with correct table names
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
        'by_status', COALESCE(jsonb_object_agg(status, count), '{}'::jsonb),
        'by_type', COALESCE(jsonb_object_agg(property_type, type_count), '{}'::jsonb),
        'average_rent', COALESCE(AVG(rent), 0)::numeric(10,2),
        'occupancy_rate', CASE 
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'occupied')::numeric / COUNT(*)::numeric * 100), 2)
          ELSE 0 
        END,
        'vacancy_cost', COALESCE(SUM(CASE WHEN status = 'vacant' THEN rent ELSE 0 END), 0)::numeric(10,2),
        'units_breakdown', COALESCE(jsonb_object_agg(
          CASE WHEN unit_count > 1 THEN 'multi_unit' ELSE 'single_unit' END,
          unit_breakdown_count
        ), '{}'::jsonb)
      )
      FROM (
        SELECT 
          status,
          COUNT(*) as count,
          property_type,
          COUNT(*) as type_count,
          rent,
          unit_count,
          COUNT(*) as unit_breakdown_count
        FROM properties
        GROUP BY status, property_type, rent, unit_count, (unit_count > 1)
      ) p
    ),
    'users', (
      SELECT jsonb_build_object(
        'landlords', COUNT(*) FILTER (WHERE user_type = 'landlord')::int,
        'tenants', COUNT(*) FILTER (WHERE user_type = 'tenant')::int,
        'total', COUNT(*)::int,
        'signups_this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::int,
        'signups_last_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE - interval '1 month') AND created_at < date_trunc('month', CURRENT_DATE))::int,
        'by_user_type', COALESCE(jsonb_object_agg(user_type, user_count), '{}'::jsonb)
      )
      FROM (
        SELECT user_type, COUNT(*) as user_count, created_at
        FROM profiles
        GROUP BY user_type, created_at
      ) u
    ),
    'applications', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'by_status', COALESCE(jsonb_object_agg(status, count), '{}'::jsonb),
        'this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::int
      )
      FROM (
        SELECT status, COUNT(*) as count, created_at
        FROM property_applications
        GROUP BY status, created_at
      ) a
    ),
    'maintenance', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'by_status', COALESCE(jsonb_object_agg(status, status_count), '{}'::jsonb),
        'by_priority', COALESCE(jsonb_object_agg(priority, priority_count), '{}'::jsonb),
        'avg_completion_days', AVG(EXTRACT(DAY FROM (completed_at - created_at)))::numeric(10,2)
      )
      FROM (
        SELECT 
          status,
          COUNT(*) as status_count,
          priority,
          COUNT(*) as priority_count,
          completed_at,
          created_at
        FROM maintenance_requests
        GROUP BY status, priority, completed_at, created_at
      ) m
    ),
    'financial', (
      SELECT jsonb_build_object(
        'total_collected', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::numeric(10,2),
        'total_pending', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::numeric(10,2),
        'total_late', COALESCE(SUM(amount) FILTER (WHERE status = 'late'), 0)::numeric(10,2),
        'payment_count', COUNT(*)::int,
        'collection_rate', CASE 
          WHEN SUM(amount) > 0 THEN ROUND((SUM(amount) FILTER (WHERE status = 'paid')::numeric / SUM(amount)::numeric * 100), 2)
          ELSE 0 
        END,
        'on_time_rate', CASE 
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'paid' AND paid_at <= due_date)::numeric / COUNT(*)::numeric * 100), 2)
          ELSE 0 
        END,
        'late_payment_count', COUNT(*) FILTER (WHERE status = 'late')::int,
        'avg_days_late', AVG(EXTRACT(DAY FROM (paid_at - due_date))) FILTER (WHERE paid_at > due_date)::numeric(10,2)
      )
      FROM rent_payments
    ),
    'messages', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::int,
        'by_sender_role', COALESCE(jsonb_object_agg(sender_role, count), '{}'::jsonb)
      )
      FROM (
        SELECT 
          COALESCE(
            (SELECT user_type FROM profiles WHERE id = sender_id),
            'system'
          ) as sender_role,
          COUNT(*) as count,
          created_at
        FROM messages
        GROUP BY sender_id, created_at
      ) msg
    ),
    'portfolios', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'total_assets', COALESCE(SUM(property_count), 0)::int,
        'avg_properties', AVG(property_count)::numeric(10,2)
      )
      FROM (
        SELECT 
          id,
          (SELECT COUNT(*) FROM properties WHERE portfolio_id = p.id) as property_count
        FROM portfolios p
      ) port
    ),
    'referrals', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'by_status', COALESCE(jsonb_object_agg(status, count), '{}'::jsonb),
        'conversion_rate', CASE 
          WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric * 100), 2)
          ELSE 0 
        END
      )
      FROM (
        SELECT status, COUNT(*) as count
        FROM referrals
        GROUP BY status
      ) r
    ),
    'points', (
      SELECT jsonb_build_object(
        'total_distributed', COALESCE(SUM(points_earned), 0)::int,
        'active_users', COUNT(DISTINCT user_id)::int,
        'this_month', COALESCE(SUM(points_earned) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0)::int
      )
      FROM loyalty_points
    ),
    'matchmaker', (
      SELECT jsonb_build_object(
        'total_interactions', COUNT(*)::int,
        'this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::int,
        'by_action_type', COALESCE(jsonb_object_agg(action_type, count), '{}'::jsonb),
        'successful_matches', COUNT(*) FILTER (WHERE action_type = 'accept' OR action_type = 'match')::int
      )
      FROM (
        SELECT action_type, COUNT(*) as count, created_at
        FROM matchmaker_actions
        GROUP BY action_type, created_at
      ) ma
    ),
    'subscriptions', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'active', COUNT(*) FILTER (WHERE status = 'active')::int,
        'by_status', COALESCE(jsonb_object_agg(status, status_count), '{}'::jsonb),
        'by_plan_type', COALESCE(jsonb_object_agg(plan_type, plan_count), '{}'::jsonb),
        'total_units', COALESCE(SUM(unit_count), 0)::int,
        'autopay_enabled_count', COUNT(*) FILTER (WHERE autopay_enabled = true)::int
      )
      FROM (
        SELECT 
          status,
          COUNT(*) as status_count,
          plan_type,
          COUNT(*) as plan_count,
          unit_count,
          autopay_enabled
        FROM subscriptions
        GROUP BY status, plan_type, unit_count, autopay_enabled
      ) s
    )
  ) INTO result;

  RETURN result;
END;
$$;