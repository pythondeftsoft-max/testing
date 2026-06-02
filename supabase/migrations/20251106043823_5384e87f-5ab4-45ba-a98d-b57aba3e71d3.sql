-- Fix column name mismatch in get_comprehensive_admin_metrics function
-- Change completed_at to completed_date for maintenance_requests table

CREATE OR REPLACE FUNCTION public.get_comprehensive_admin_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'properties', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_status', COALESCE(jsonb_object_agg(status, status_count) FILTER (WHERE status IS NOT NULL), '{}'::jsonb),
        'by_type', COALESCE(jsonb_object_agg(property_type, type_count) FILTER (WHERE property_type IS NOT NULL), '{}'::jsonb),
        'average_rent', COALESCE(AVG(rent), 0),
        'occupancy_rate', CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'occupied')::numeric / COUNT(*)::numeric) * 100 ELSE 0 END,
        'vacancy_cost', COALESCE(SUM(CASE WHEN status = 'vacant' THEN rent ELSE 0 END), 0),
        'units_breakdown', COALESCE(jsonb_object_agg(units, units_count) FILTER (WHERE units IS NOT NULL), '{}'::jsonb)
      )
      FROM (
        SELECT 
          status,
          property_type,
          rent,
          units,
          COUNT(*) OVER (PARTITION BY status) as status_count,
          COUNT(*) OVER (PARTITION BY property_type) as type_count,
          COUNT(*) OVER (PARTITION BY units) as units_count
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
        FROM applications
      ) a
    ),
    'maintenance', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_status', COALESCE(jsonb_object_agg(status, status_count) FILTER (WHERE status IS NOT NULL), '{}'::jsonb),
        'by_priority', COALESCE(jsonb_object_agg(priority, priority_count) FILTER (WHERE priority IS NOT NULL), '{}'::jsonb),
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
    ),
    'financial', (
      SELECT jsonb_build_object(
        'total_collected', COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0),
        'total_pending', COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN amount ELSE 0 END), 0),
        'total_late', COALESCE(SUM(CASE WHEN payment_status = 'late' THEN amount ELSE 0 END), 0),
        'payment_count', COUNT(*),
        'collection_rate', CASE WHEN SUM(amount) > 0 THEN (SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END) / SUM(amount)) * 100 ELSE 0 END,
        'on_time_rate', CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE payment_status = 'paid' AND payment_date <= due_date)::numeric / COUNT(*)::numeric) * 100 ELSE 0 END,
        'late_payment_count', COUNT(*) FILTER (WHERE payment_status = 'late'),
        'avg_days_late', AVG(CASE WHEN payment_status = 'late' AND payment_date IS NOT NULL THEN EXTRACT(epoch FROM (payment_date - due_date))/86400 END)
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
          sender_role,
          created_at,
          COUNT(*) OVER (PARTITION BY sender_role) as role_count
        FROM messages
      ) msg
    ),
    'portfolios', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'total_assets', COALESCE(SUM(total_assets), 0),
        'avg_properties', AVG(total_properties)
      )
      FROM portfolios
    ),
    'referrals', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_status', COALESCE(jsonb_object_agg(status, status_count) FILTER (WHERE status IS NOT NULL), '{}'::jsonb),
        'conversion_rate', CASE WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'converted')::numeric / COUNT(*)::numeric) * 100 ELSE 0 END
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
        'total_distributed', COALESCE(SUM(points_change), 0),
        'active_users', COUNT(DISTINCT user_id),
        'this_month', COALESCE(SUM(CASE WHEN created_at >= date_trunc('month', CURRENT_DATE) THEN points_change ELSE 0 END), 0)
      )
      FROM points_history
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
        FROM matchmaker_interactions
      ) mm
    ),
    'subscriptions', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'active', COUNT(*) FILTER (WHERE status = 'active'),
        'by_status', COALESCE(jsonb_object_agg(status, status_count) FILTER (WHERE status IS NOT NULL), '{}'::jsonb),
        'by_plan_type', COALESCE(jsonb_object_agg(plan_type, plan_count) FILTER (WHERE plan_type IS NOT NULL), '{}'::jsonb),
        'by_role', COALESCE(jsonb_object_agg(role, role_count) FILTER (WHERE role IS NOT NULL), '{}'::jsonb),
        'total_units', COALESCE(SUM(unit_count), 0),
        'active_units', COALESCE(SUM(CASE WHEN status = 'active' THEN unit_count ELSE 0 END), 0),
        'autopay_enabled_count', COUNT(*) FILTER (WHERE autopay_enabled = true),
        'subscribed_users', COUNT(DISTINCT user_id)
      )
      FROM (
        SELECT 
          status,
          plan_type,
          role,
          unit_count,
          autopay_enabled,
          user_id,
          COUNT(*) OVER (PARTITION BY status) as status_count,
          COUNT(*) OVER (PARTITION BY plan_type) as plan_count,
          COUNT(*) OVER (PARTITION BY role) as role_count
        FROM subscriptions
      ) s
    )
  ) INTO result;

  RETURN result;
END;
$function$;