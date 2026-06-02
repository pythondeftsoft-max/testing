-- Fix rent column reference in get_comprehensive_admin_metrics function
-- The properties table uses 'monthly_rent' not 'rent'

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
    'properties', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_status', COALESCE(jsonb_object_agg(status, count), '{}'::jsonb),
        'by_type', COALESCE(jsonb_object_agg(property_type, type_count), '{}'::jsonb),
        'average_rent', COALESCE(AVG(monthly_rent), 0),
        'occupancy_rate', CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'occupied')::numeric / COUNT(*)::numeric) * 100, 2) ELSE 0 END,
        'vacancy_cost', COALESCE(SUM(CASE WHEN status = 'vacant' THEN monthly_rent ELSE 0 END), 0),
        'units_breakdown', COALESCE(jsonb_object_agg(units::text, units_count), '{}'::jsonb)
      )
      FROM (
        SELECT 
          status,
          property_type,
          monthly_rent,
          units,
          COUNT(*) OVER (PARTITION BY status) as count,
          COUNT(*) OVER (PARTITION BY property_type) as type_count,
          COUNT(*) OVER (PARTITION BY units) as units_count
        FROM properties
      ) p
      LIMIT 1
    ),
    'users', (
      SELECT jsonb_build_object(
        'landlords', COUNT(*) FILTER (WHERE user_type = 'landlord'),
        'tenants', COUNT(*) FILTER (WHERE user_type = 'tenant'),
        'total', COUNT(*),
        'signups_this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)),
        'signups_last_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE - interval '1 month') AND created_at < date_trunc('month', CURRENT_DATE)),
        'by_user_type', COALESCE(jsonb_object_agg(user_type, type_count), '{}'::jsonb)
      )
      FROM (
        SELECT 
          user_type,
          created_at,
          COUNT(*) OVER (PARTITION BY user_type) as type_count
        FROM profiles
      ) u
      LIMIT 1
    ),
    'applications', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_status', COALESCE(jsonb_object_agg(status, count), '{}'::jsonb),
        'this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))
      )
      FROM (
        SELECT 
          status,
          created_at,
          COUNT(*) OVER (PARTITION BY status) as count
        FROM rental_applications
      ) a
      LIMIT 1
    ),
    'maintenance', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_status', COALESCE(jsonb_object_agg(status, status_count), '{}'::jsonb),
        'by_priority', COALESCE(jsonb_object_agg(priority, priority_count), '{}'::jsonb),
        'avg_completion_days', AVG(CASE WHEN completed_date IS NOT NULL THEN EXTRACT(epoch FROM (completed_date - created_at))/86400 END)
      )
      FROM (
        SELECT 
          status,
          priority,
          created_at,
          completed_date,
          COUNT(*) OVER (PARTITION BY status) as status_count,
          COUNT(*) OVER (PARTITION BY priority) as priority_count
        FROM maintenance_requests
      ) m
      LIMIT 1
    ),
    'financial', (
      SELECT jsonb_build_object(
        'total_collected', COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0),
        'total_pending', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0),
        'total_late', COALESCE(SUM(amount) FILTER (WHERE status = 'overdue'), 0),
        'payment_count', COUNT(*),
        'collection_rate', CASE WHEN SUM(amount) > 0 THEN ROUND((COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) / SUM(amount)) * 100, 2) ELSE 0 END,
        'on_time_rate', CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'completed' AND due_date >= payment_date)::numeric / COUNT(*)::numeric) * 100, 2) ELSE 0 END,
        'late_payment_count', COUNT(*) FILTER (WHERE status = 'completed' AND payment_date > due_date),
        'avg_days_late', AVG(CASE WHEN status = 'completed' AND payment_date > due_date THEN EXTRACT(epoch FROM (payment_date - due_date))/86400 END)
      )
      FROM rent_payments
    ),
    'messages', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)),
        'by_sender_role', COALESCE(jsonb_object_agg(sender_role, count), '{}'::jsonb)
      )
      FROM (
        SELECT 
          sender_role,
          created_at,
          COUNT(*) OVER (PARTITION BY sender_role) as count
        FROM messages
      ) msg
      LIMIT 1
    ),
    'portfolios', (
      SELECT jsonb_build_object(
        'total', COUNT(DISTINCT id),
        'total_assets', COALESCE(SUM(asset_count), 0),
        'avg_properties', AVG(asset_count)
      )
      FROM (
        SELECT 
          p.id,
          COUNT(pa.asset_id) as asset_count
        FROM portfolios p
        LEFT JOIN portfolio_assets pa ON p.id = pa.portfolio_id
        GROUP BY p.id
      ) port
    ),
    'referrals', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_status', COALESCE(jsonb_object_agg(status, count), '{}'::jsonb),
        'conversion_rate', CASE WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric) * 100, 2) ELSE 0 END
      )
      FROM (
        SELECT 
          status,
          COUNT(*) OVER (PARTITION BY status) as count
        FROM referrals
      ) r
      LIMIT 1
    ),
    'points', (
      SELECT jsonb_build_object(
        'total_distributed', COALESCE(SUM(points_earned), 0),
        'active_users', COUNT(DISTINCT user_id),
        'this_month', COALESCE(SUM(points_earned) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0)
      )
      FROM points_history
    ),
    'matchmaker', (
      SELECT jsonb_build_object(
        'total_interactions', COUNT(*),
        'this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)),
        'by_action_type', COALESCE(jsonb_object_agg(action_type, count), '{}'::jsonb),
        'successful_matches', COUNT(*) FILTER (WHERE action_type = 'match')
      )
      FROM (
        SELECT 
          action_type,
          created_at,
          COUNT(*) OVER (PARTITION BY action_type) as count
        FROM matchmaker_interactions
      ) mi
      LIMIT 1
    ),
    'subscriptions', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'active', COUNT(*) FILTER (WHERE status = 'active'),
        'by_status', COALESCE(jsonb_object_agg(status, status_count), '{}'::jsonb),
        'by_plan_type', COALESCE(jsonb_object_agg(plan_type, plan_count), '{}'::jsonb),
        'by_role', COALESCE(jsonb_object_agg(user_role, role_count), '{}'::jsonb),
        'total_units', COALESCE(SUM(units_covered), 0),
        'active_units', COALESCE(SUM(units_covered) FILTER (WHERE status = 'active'), 0),
        'autopay_enabled_count', COUNT(*) FILTER (WHERE autopay_enabled = true),
        'subscribed_users', COUNT(DISTINCT user_id)
      )
      FROM (
        SELECT 
          status,
          plan_type,
          user_role,
          units_covered,
          autopay_enabled,
          user_id,
          COUNT(*) OVER (PARTITION BY status) as status_count,
          COUNT(*) OVER (PARTITION BY plan_type) as plan_count,
          COUNT(*) OVER (PARTITION BY user_role) as role_count
        FROM subscriptions
      ) s
      LIMIT 1
    )
  ) INTO result;
  
  RETURN result;
END;
$$;