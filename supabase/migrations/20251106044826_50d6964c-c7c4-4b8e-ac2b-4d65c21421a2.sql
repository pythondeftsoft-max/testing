-- Fix table name mismatches in get_comprehensive_admin_metrics function
-- Changes: rental_applications -> property_applications, matchmaker_interactions -> matchmaker_actions

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
        'occupancy_rate', CASE 
          WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'occupied')::float / COUNT(*)) * 100
          ELSE 0
        END,
        'vacancy_cost', COALESCE(SUM(CASE WHEN status = 'vacant' THEN monthly_rent ELSE 0 END), 0),
        'units_breakdown', COALESCE(jsonb_object_agg(bedrooms || ' bed', bed_count), '{}'::jsonb)
      )
      FROM (
        SELECT 
          status,
          property_type,
          monthly_rent,
          bedrooms,
          COUNT(*) OVER (PARTITION BY bedrooms) as bed_count,
          COUNT(*) OVER (PARTITION BY status) as count,
          COUNT(*) OVER (PARTITION BY property_type) as type_count
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
        'by_user_type', COALESCE(jsonb_object_agg(user_type, type_count), '{}'::jsonb)
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
        'by_status', COALESCE(jsonb_object_agg(status, count), '{}'::jsonb),
        'this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))
      )
      FROM (
        SELECT 
          status,
          created_at,
          COUNT(*) OVER (PARTITION BY status) as count
        FROM property_applications
      ) a
    ),
    'maintenance', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_status', COALESCE(jsonb_object_agg(status, status_count), '{}'::jsonb),
        'by_priority', COALESCE(jsonb_object_agg(priority, priority_count), '{}'::jsonb),
        'avg_completion_days', AVG(EXTRACT(day FROM (completed_date - created_at)))
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
        'total_collected', COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0),
        'total_pending', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0),
        'total_late', COALESCE(SUM(amount) FILTER (WHERE status = 'late'), 0),
        'payment_count', COUNT(*),
        'collection_rate', CASE 
          WHEN SUM(amount) > 0 THEN (SUM(amount) FILTER (WHERE status = 'completed')::float / SUM(amount)) * 100
          ELSE 0
        END,
        'on_time_rate', CASE 
          WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'completed' AND paid_at <= due_date)::float / COUNT(*)) * 100
          ELSE 0
        END,
        'late_payment_count', COUNT(*) FILTER (WHERE status = 'late'),
        'avg_days_late', AVG(EXTRACT(day FROM (paid_at - due_date))) FILTER (WHERE paid_at > due_date)
      )
      FROM rent_payments
    ),
    'messages', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)),
        'by_sender_role', COALESCE(jsonb_object_agg(sender_role, role_count), '{}'::jsonb)
      )
      FROM (
        SELECT 
          created_at,
          sender_role,
          COUNT(*) OVER (PARTITION BY sender_role) as role_count
        FROM messages
      ) msg
    ),
    'portfolios', (
      SELECT jsonb_build_object(
        'total', COUNT(DISTINCT portfolio_id),
        'total_assets', COUNT(*),
        'avg_properties', AVG(asset_count)
      )
      FROM (
        SELECT 
          portfolio_id,
          COUNT(*) OVER (PARTITION BY portfolio_id) as asset_count
        FROM portfolio_assets
      ) pa
    ),
    'referrals', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'by_status', COALESCE(jsonb_object_agg(status, count), '{}'::jsonb),
        'conversion_rate', CASE 
          WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'completed')::float / COUNT(*)) * 100
          ELSE 0
        END
      )
      FROM (
        SELECT 
          status,
          COUNT(*) OVER (PARTITION BY status) as count
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
        'by_action_type', COALESCE(jsonb_object_agg(action_type, count), '{}'::jsonb),
        'successful_matches', COUNT(*) FILTER (WHERE action_type = 'accept')
      )
      FROM (
        SELECT 
          action_type,
          created_at,
          COUNT(*) OVER (PARTITION BY action_type) as count
        FROM matchmaker_actions
      ) mi
    ),
    'subscriptions', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'active', COUNT(*) FILTER (WHERE status = 'active'),
        'by_status', COALESCE(jsonb_object_agg(status, status_count), '{}'::jsonb),
        'by_plan_type', COALESCE(jsonb_object_agg(plan_type, plan_count), '{}'::jsonb),
        'by_role', COALESCE(jsonb_object_agg(user_role, role_count), '{}'::jsonb),
        'total_units', COALESCE(SUM(units_included), 0),
        'active_units', COALESCE(SUM(units_included) FILTER (WHERE status = 'active'), 0),
        'autopay_enabled_count', COUNT(*) FILTER (WHERE autopay_enabled = true),
        'subscribed_users', COUNT(DISTINCT user_id)
      )
      FROM (
        SELECT 
          status,
          plan_type,
          user_role,
          units_included,
          autopay_enabled,
          user_id,
          COUNT(*) OVER (PARTITION BY status) as status_count,
          COUNT(*) OVER (PARTITION BY plan_type) as plan_count,
          COUNT(*) OVER (PARTITION BY user_role) as role_count
        FROM subscriptions
      ) s
    )
  ) INTO result;

  RETURN result;
END;
$$;