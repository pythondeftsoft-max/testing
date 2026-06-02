-- Drop the existing function
DROP FUNCTION IF EXISTS get_comprehensive_admin_metrics();

-- Recreate with enhanced subscription metrics
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
        'by_status', COALESCE(jsonb_object_agg(status, status_count) FILTER (WHERE status IS NOT NULL), '{}'::jsonb),
        'by_type', COALESCE(jsonb_object_agg(property_type, type_count) FILTER (WHERE property_type IS NOT NULL), '{}'::jsonb),
        'average_rent', COALESCE(AVG(monthly_rent), 0),
        'occupancy_rate', CASE WHEN SUM(unit_count) > 0 THEN (COUNT(*) FILTER (WHERE status = 'occupied')::numeric / COUNT(*)::numeric * 100) ELSE 0 END,
        'vacancy_cost', COALESCE(SUM(CASE WHEN status = 'vacant' THEN monthly_rent ELSE 0 END), 0),
        'units_breakdown', COALESCE(jsonb_object_agg(unit_count::text, unit_count_total) FILTER (WHERE unit_count IS NOT NULL), '{}'::jsonb)
      )
      FROM (
        SELECT 
          status,
          property_type,
          monthly_rent,
          unit_count,
          COUNT(*) OVER (PARTITION BY status) as status_count,
          COUNT(*) OVER (PARTITION BY property_type) as type_count,
          COUNT(*) OVER (PARTITION BY unit_count) as unit_count_total
        FROM properties
      ) p
    ),
    'users', (
      SELECT jsonb_build_object(
        'landlords', COUNT(*) FILTER (WHERE user_type = 'landlord'),
        'tenants', COUNT(*) FILTER (WHERE user_type = 'tenant'),
        'total', COUNT(*),
        'signups_this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)),
        'signups_last_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE - interval '1 month') AND created_at < date_trunc('month', CURRENT_DATE)),
        'by_user_type', COALESCE(jsonb_object_agg(user_type, type_count) FILTER (WHERE user_type IS NOT NULL), '{}'::jsonb)
      )
      FROM (
        SELECT 
          user_type,
          created_at,
          COUNT(*) OVER (PARTITION BY user_type) as type_count
        FROM profiles
      ) u
    ),
    'applications', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_status', COALESCE(jsonb_object_agg(status, status_count) FILTER (WHERE status IS NOT NULL), '{}'::jsonb),
        'this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))
      )
      FROM (
        SELECT 
          status,
          created_at,
          COUNT(*) OVER (PARTITION BY status) as status_count
        FROM property_applications
      ) a
    ),
    'maintenance', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_status', COALESCE(jsonb_object_agg(status, status_count) FILTER (WHERE status IS NOT NULL), '{}'::jsonb),
        'by_priority', COALESCE(jsonb_object_agg(priority, priority_count) FILTER (WHERE priority IS NOT NULL), '{}'::jsonb),
        'avg_completion_days', AVG(CASE WHEN completed_at IS NOT NULL THEN EXTRACT(epoch FROM (completed_at - created_at))/86400 END)
      )
      FROM (
        SELECT 
          status,
          priority,
          created_at,
          completed_at,
          COUNT(*) OVER (PARTITION BY status) as status_count,
          COUNT(*) OVER (PARTITION BY priority) as priority_count
        FROM maintenance_requests
      ) m
    ),
    'financial', (
      SELECT jsonb_build_object(
        'total_collected', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
        'total_pending', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0),
        'total_late', COALESCE(SUM(amount) FILTER (WHERE status = 'late'), 0),
        'payment_count', COUNT(*),
        'collection_rate', CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'paid')::numeric / COUNT(*)::numeric * 100) ELSE 0 END,
        'on_time_rate', CASE WHEN COUNT(*) FILTER (WHERE status IN ('paid', 'late')) > 0 THEN (COUNT(*) FILTER (WHERE status = 'paid' AND paid_date <= due_date)::numeric / COUNT(*) FILTER (WHERE status IN ('paid', 'late'))::numeric * 100) ELSE 0 END,
        'late_payment_count', COUNT(*) FILTER (WHERE status = 'late'),
        'avg_days_late', AVG(CASE WHEN status = 'late' AND paid_date IS NOT NULL THEN EXTRACT(epoch FROM (paid_date - due_date))/86400 END)
      )
      FROM rent_payments
    ),
    'messages', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)),
        'by_sender_role', COALESCE(jsonb_object_agg(sender_role, role_count) FILTER (WHERE sender_role IS NOT NULL), '{}'::jsonb)
      )
      FROM (
        SELECT 
          created_at,
          CASE 
            WHEN sender_id IN (SELECT id FROM profiles WHERE user_type = 'landlord') THEN 'landlord'
            WHEN sender_id IN (SELECT id FROM profiles WHERE user_type = 'tenant') THEN 'tenant'
            ELSE 'other'
          END as sender_role,
          COUNT(*) OVER (PARTITION BY CASE 
            WHEN sender_id IN (SELECT id FROM profiles WHERE user_type = 'landlord') THEN 'landlord'
            WHEN sender_id IN (SELECT id FROM profiles WHERE user_type = 'tenant') THEN 'tenant'
            ELSE 'other'
          END) as role_count
        FROM messages
      ) msg
    ),
    'portfolios', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'total_assets', COALESCE(SUM(total_value), 0),
        'avg_properties', AVG((SELECT COUNT(*) FROM properties WHERE portfolio_id = portfolios.id))
      )
      FROM portfolios
    ),
    'referrals', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_status', COALESCE(jsonb_object_agg(status, status_count) FILTER (WHERE status IS NOT NULL), '{}'::jsonb),
        'conversion_rate', CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)::numeric * 100) ELSE 0 END
      )
      FROM (
        SELECT 
          status,
          COUNT(*) OVER (PARTITION BY status) as status_count
        FROM referrals
      ) r
    ),
    'points', (
      SELECT jsonb_build_object(
        'total_distributed', COALESCE(SUM(points_amount), 0),
        'active_users', COUNT(DISTINCT user_id),
        'this_month', COALESCE(SUM(points_amount) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0)
      )
      FROM points_transactions
    ),
    'matchmaker', (
      SELECT jsonb_build_object(
        'total_interactions', COUNT(*),
        'this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)),
        'by_action_type', COALESCE(jsonb_object_agg(action_type, action_count) FILTER (WHERE action_type IS NOT NULL), '{}'::jsonb),
        'successful_matches', COUNT(*) FILTER (WHERE action_type = 'match')
      )
      FROM (
        SELECT 
          action_type,
          created_at,
          COUNT(*) OVER (PARTITION BY action_type) as action_count
        FROM matchmaker_actions
      ) ma
    ),
    'subscriptions', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'active', COUNT(*) FILTER (WHERE status = 'active'),
        'by_status', COALESCE(jsonb_object_agg(status, status_count) FILTER (WHERE status IS NOT NULL), '{}'::jsonb),
        'by_plan_type', COALESCE(jsonb_object_agg(plan_type, plan_count) FILTER (WHERE plan_type IS NOT NULL), '{}'::jsonb),
        'by_role', COALESCE(
          (SELECT jsonb_object_agg(role, role_count)
           FROM (
             SELECT 
               p.user_type as role,
               COUNT(*) as role_count
             FROM subscriptions s
             JOIN profiles p ON s.user_id = p.id
             WHERE s.status = 'active'
             GROUP BY p.user_type
           ) role_data),
          '{}'::jsonb
        ),
        'total_units', COALESCE(SUM(unit_count), 0),
        'active_units', COALESCE(SUM(unit_count) FILTER (WHERE status = 'active'), 0),
        'autopay_enabled_count', COUNT(*) FILTER (WHERE autopay_enabled = true),
        'subscribed_users', COUNT(DISTINCT user_id) FILTER (WHERE status = 'active')
      )
      FROM (
        SELECT 
          status,
          plan_type,
          unit_count,
          autopay_enabled,
          user_id,
          COUNT(*) OVER (PARTITION BY status) as status_count,
          COUNT(*) OVER (PARTITION BY plan_type) as plan_count
        FROM subscriptions
      ) s
    )
  ) INTO result;

  RETURN result;
END;
$$;