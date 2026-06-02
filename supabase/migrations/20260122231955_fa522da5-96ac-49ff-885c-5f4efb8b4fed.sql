CREATE OR REPLACE FUNCTION public.get_comprehensive_admin_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'properties', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'by_status', COALESCE((
          SELECT jsonb_object_agg(status, count)
          FROM (
            SELECT status, COUNT(*)::int as count
            FROM properties
            GROUP BY status
          ) s
        ), '{}'::jsonb),
        'by_type', COALESCE((
          SELECT jsonb_object_agg(property_type, count)
          FROM (
            SELECT property_type, COUNT(*)::int as count
            FROM properties
            GROUP BY property_type
          ) t
        ), '{}'::jsonb),
        'average_rent', COALESCE(AVG(monthly_rent), 0),
        'occupancy_rate', CASE 
          WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'occupied')::float / COUNT(*)) * 100
          ELSE 0
        END,
        'vacancy_cost', COALESCE(SUM(CASE WHEN status = 'vacant' THEN monthly_rent ELSE 0 END), 0),
        'units_breakdown', (
          SELECT jsonb_build_object(
            'total_units', COALESCE(SUM(unit_count), 0),
            'occupied_units', COALESCE(SUM(CASE WHEN status = 'occupied' THEN unit_count ELSE 0 END), 0),
            'vacant_units', COALESCE(SUM(CASE WHEN status = 'vacant' THEN unit_count ELSE 0 END), 0)
          )
          FROM properties
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
        'by_user_type', COALESCE((
          SELECT jsonb_object_agg(user_type, count)
          FROM (
            SELECT user_type, COUNT(*)::int as count
            FROM profiles
            GROUP BY user_type
          ) u
        ), '{}'::jsonb)
      )
      FROM profiles
    ),
    'applications', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'by_status', COALESCE((
          SELECT jsonb_object_agg(status, count)
          FROM (
            SELECT status, COUNT(*)::int as count
            FROM property_applications
            GROUP BY status
          ) a
        ), '{}'::jsonb),
        'this_month', COUNT(*) FILTER (WHERE submitted_at >= date_trunc('month', CURRENT_DATE))::int
      )
      FROM property_applications
    ),
    'maintenance', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'by_status', COALESCE((
          SELECT jsonb_object_agg(status, count)
          FROM (
            SELECT status, COUNT(*)::int as count
            FROM maintenance_requests
            GROUP BY status
          ) m
        ), '{}'::jsonb),
        'by_priority', COALESCE((
          SELECT jsonb_object_agg(priority, count)
          FROM (
            SELECT priority, COUNT(*)::int as count
            FROM maintenance_requests
            GROUP BY priority
          ) p
        ), '{}'::jsonb),
        'avg_completion_days', COALESCE(AVG(EXTRACT(day FROM (completed_date - created_at))) FILTER (WHERE completed_date IS NOT NULL), 0)
      )
      FROM maintenance_requests
    ),
    'financial', (
      SELECT jsonb_build_object(
        'total_collected', COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0),
        'total_pending', COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0),
        'total_late', COALESCE(SUM(amount) FILTER (WHERE status = 'overdue'), 0),
        'payment_count', COUNT(*)::int,
        'collection_rate', CASE 
          WHEN SUM(amount) > 0 THEN (SUM(amount) FILTER (WHERE status = 'completed')::float / SUM(amount)) * 100
          ELSE 0
        END,
        'on_time_rate', CASE 
          WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'completed' AND payment_date <= due_date)::float / NULLIF(COUNT(*), 0)) * 100
          ELSE 0
        END,
        'late_payment_count', COUNT(*) FILTER (WHERE status = 'overdue')::int,
        'avg_days_late', COALESCE(AVG(EXTRACT(day FROM (payment_date - due_date))) FILTER (WHERE payment_date > due_date), 0)
      )
      FROM rent_payments
    ),
    'messages', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::int,
        'by_sender_role', COALESCE((
          SELECT jsonb_object_agg(sender_role, count)
          FROM (
            SELECT sender_role, COUNT(*)::int as count
            FROM messages
            GROUP BY sender_role
          ) r
        ), '{}'::jsonb)
      )
      FROM messages
    ),
    'portfolios', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'total_assets', COALESCE((SELECT COUNT(*) FROM portfolio_assets), 0)::int,
        'avg_properties', COALESCE(AVG(property_count), 0)
      )
      FROM (
        SELECT p.id, COUNT(pa.id) as property_count
        FROM portfolios p
        LEFT JOIN portfolio_assets pa ON pa.portfolio_id = p.id
        GROUP BY p.id
      ) portfolio_counts
    ),
    'referrals', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'by_status', COALESCE((
          SELECT jsonb_object_agg(status, count)
          FROM (
            SELECT status, COUNT(*)::int as count
            FROM referrals
            GROUP BY status
          ) ref
        ), '{}'::jsonb),
        'conversion_rate', CASE 
          WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'converted')::float / COUNT(*)) * 100
          ELSE 0
        END
      )
      FROM referrals
    ),
    'points', (
      SELECT jsonb_build_object(
        'total_distributed', COALESCE(SUM(points), 0)::int,
        'active_users', COUNT(DISTINCT user_id)::int,
        'this_month', COALESCE(SUM(points) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0)::int
      )
      FROM points_transactions
    ),
    'matchmaker', (
      SELECT jsonb_build_object(
        'total_interactions', COUNT(*)::int,
        'this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))::int,
        'by_action_type', COALESCE((
          SELECT jsonb_object_agg(action_type, count)
          FROM (
            SELECT action_type, COUNT(*)::int as count
            FROM matchmaker_interactions
            GROUP BY action_type
          ) mi
        ), '{}'::jsonb),
        'successful_matches', COUNT(*) FILTER (WHERE action_type = 'match')::int
      )
      FROM matchmaker_interactions
    ),
    'subscriptions', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::int,
        'active', COUNT(*) FILTER (WHERE status = 'active')::int,
        'by_status', COALESCE((
          SELECT jsonb_object_agg(status, count)
          FROM (
            SELECT status, COUNT(*)::int as count
            FROM subscriptions
            GROUP BY status
          ) sub
        ), '{}'::jsonb),
        'by_plan_type', COALESCE((
          SELECT jsonb_object_agg(plan_type, count)
          FROM (
            SELECT plan_type, COUNT(*)::int as count
            FROM subscriptions
            GROUP BY plan_type
          ) pt
        ), '{}'::jsonb),
        'by_role', COALESCE((
          SELECT jsonb_object_agg(role, count)
          FROM (
            SELECT role, COUNT(*)::int as count
            FROM subscriptions
            GROUP BY role
          ) r
        ), '{}'::jsonb),
        'total_units', COALESCE(SUM(unit_count), 0)::int,
        'active_units', COALESCE(SUM(unit_count) FILTER (WHERE status = 'active'), 0)::int,
        'autopay_enabled_count', COUNT(*) FILTER (WHERE autopay_enabled = true)::int,
        'subscribed_users', COUNT(DISTINCT user_id)::int
      )
      FROM subscriptions
    )
  ) INTO result;
  
  RETURN result;
END;
$$;