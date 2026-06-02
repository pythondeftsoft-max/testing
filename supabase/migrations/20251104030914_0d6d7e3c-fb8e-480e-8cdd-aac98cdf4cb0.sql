-- Drop and recreate the comprehensive admin metrics function with fixes and enhancements
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
    -- Properties section with enhanced occupancy insights
    'properties', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM properties),
      'by_status', (
        SELECT jsonb_object_agg(status, count)
        FROM (
          SELECT status, COUNT(*)::int as count
          FROM properties
          GROUP BY status
        ) p
      ),
      'by_type', (
        SELECT jsonb_object_agg(property_type, count)
        FROM (
          SELECT property_type, COUNT(*)::int as count
          FROM properties
          GROUP BY property_type
        ) pt
      ),
      'average_rent', COALESCE((SELECT AVG(monthly_rent) FROM properties WHERE monthly_rent IS NOT NULL), 0),
      'occupancy_rate', COALESCE(
        ROUND(
          (SELECT COUNT(*)::numeric FROM properties WHERE status = 'occupied') / 
          NULLIF((SELECT COUNT(*)::numeric FROM properties), 0) * 100, 
          2
        ), 
        0
      ),
      'vacancy_cost', COALESCE((SELECT SUM(monthly_rent) FROM properties WHERE status = 'available'), 0),
      'units_breakdown', (
        SELECT jsonb_object_agg(has_units, count)
        FROM (
          SELECT 
            CASE WHEN has_multiple_units THEN 'multi_unit' ELSE 'single_unit' END as has_units,
            COUNT(*)::int as count
          FROM properties
          GROUP BY has_multiple_units
        ) u
      )
    ),
    
    -- Users section with signup trends
    'users', jsonb_build_object(
      'landlords', (SELECT COUNT(*) FROM profiles WHERE user_type = 'landlord'),
      'tenants', (SELECT COUNT(*) FROM profiles WHERE user_type = 'tenant'),
      'total', (SELECT COUNT(*) FROM profiles),
      'signups_this_month', (SELECT COUNT(*) FROM profiles WHERE created_at >= date_trunc('month', CURRENT_DATE)),
      'signups_last_month', (SELECT COUNT(*) FROM profiles WHERE created_at >= date_trunc('month', CURRENT_DATE - interval '1 month') AND created_at < date_trunc('month', CURRENT_DATE)),
      'by_user_type', (
        SELECT jsonb_object_agg(user_type, count)
        FROM (
          SELECT user_type::text, COUNT(*)::int as count
          FROM profiles
          WHERE user_type IS NOT NULL
          GROUP BY user_type
        ) ut
      )
    ),
    
    -- Applications section
    'applications', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM property_applications),
      'by_status', (
        SELECT jsonb_object_agg(status, count)
        FROM (
          SELECT status, COUNT(*)::int as count
          FROM property_applications
          GROUP BY status
        ) a
      ),
      'this_month', (SELECT COUNT(*) FROM property_applications WHERE created_at >= date_trunc('month', CURRENT_DATE))
    ),
    
    -- Maintenance section
    'maintenance', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM maintenance_requests),
      'by_status', (
        SELECT jsonb_object_agg(status, count)
        FROM (
          SELECT status, COUNT(*)::int as count
          FROM maintenance_requests
          GROUP BY status
        ) m
      ),
      'by_priority', (
        SELECT jsonb_object_agg(priority, count)
        FROM (
          SELECT 
            CASE 
              WHEN priority IN ('low', 'medium', 'high', 'urgent') THEN priority
              ELSE 'medium'
            END as priority,
            COUNT(*)::int as count
          FROM maintenance_requests
          GROUP BY 
            CASE 
              WHEN priority IN ('low', 'medium', 'high', 'urgent') THEN priority
              ELSE 'medium'
            END
        ) mp
      ),
      'avg_completion_days', (
        SELECT AVG(EXTRACT(day FROM (completed_at - created_at)))
        FROM maintenance_requests
        WHERE completed_at IS NOT NULL
      )
    ),
    
    -- Financial section with enhanced rent collection health
    'financial', jsonb_build_object(
      'total_collected', COALESCE((SELECT SUM(amount) FROM rent_payments WHERE status = 'completed'), 0),
      'total_pending', COALESCE((SELECT SUM(amount) FROM rent_payments WHERE status = 'pending'), 0),
      'total_late', COALESCE((SELECT SUM(amount) FROM rent_payments WHERE status = 'completed' AND paid_at > due_date), 0),
      'payment_count', (SELECT COUNT(*) FROM rent_payments),
      'collection_rate', COALESCE(
        ROUND(
          (SELECT COUNT(*)::numeric FROM rent_payments WHERE status = 'completed') / 
          NULLIF((SELECT COUNT(*)::numeric FROM rent_payments), 0) * 100,
          2
        ),
        0
      ),
      'on_time_rate', COALESCE(
        ROUND(
          (SELECT COUNT(*)::numeric FROM rent_payments WHERE status = 'completed' AND paid_at <= due_date) / 
          NULLIF((SELECT COUNT(*)::numeric FROM rent_payments WHERE status = 'completed'), 0) * 100,
          2
        ),
        0
      ),
      'late_payment_count', (SELECT COUNT(*) FROM rent_payments WHERE status = 'completed' AND paid_at > due_date),
      'avg_days_late', (
        SELECT AVG(EXTRACT(day FROM (paid_at - due_date)))
        FROM rent_payments
        WHERE status = 'completed' AND paid_at > due_date
      )
    ),
    
    -- Messages section (FIXED enum casting issue)
    'messages', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM messages),
      'this_month', (SELECT COUNT(*) FROM messages WHERE created_at >= date_trunc('month', CURRENT_DATE)),
      'by_sender_role', (
        SELECT jsonb_object_agg(sender_type, count)
        FROM (
          SELECT 
            COALESCE(p.user_type::text, 'no_profile') as sender_type,
            COUNT(*)::int as count
          FROM messages m
          LEFT JOIN profiles p ON m.sender_id = p.id
          GROUP BY p.user_type::text
        ) msg_stats
      )
    ),
    
    -- Portfolios section
    'portfolios', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM portfolios),
      'total_assets', (SELECT COUNT(*) FROM portfolio_assets),
      'avg_properties', (
        SELECT AVG(asset_count)
        FROM (
          SELECT portfolio_id, COUNT(*) as asset_count
          FROM portfolio_assets
          GROUP BY portfolio_id
        ) pa
      )
    ),
    
    -- Referrals section
    'referrals', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM referrals),
      'by_status', (
        SELECT jsonb_object_agg(status, count)
        FROM (
          SELECT status, COUNT(*)::int as count
          FROM referrals
          GROUP BY status
        ) r
      ),
      'conversion_rate', COALESCE(
        ROUND(
          (SELECT COUNT(*)::numeric FROM referrals WHERE status = 'completed') / 
          NULLIF((SELECT COUNT(*)::numeric FROM referrals), 0) * 100,
          2
        ),
        0
      )
    ),
    
    -- Points section
    'points', jsonb_build_object(
      'total_distributed', COALESCE((SELECT SUM(points_earned) FROM user_points), 0),
      'active_users', (SELECT COUNT(DISTINCT user_id) FROM user_points),
      'this_month', COALESCE((SELECT SUM(points_earned) FROM user_points WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0)
    ),
    
    -- Enhanced Matchmaker section
    'matchmaker', jsonb_build_object(
      'total_interactions', (SELECT COUNT(*) FROM matchmaker_actions),
      'this_month', (SELECT COUNT(*) FROM matchmaker_actions WHERE created_at >= date_trunc('month', CURRENT_DATE)),
      'by_action_type', (
        SELECT jsonb_object_agg(action_type, count)
        FROM (
          SELECT action_type, COUNT(*)::int as count
          FROM matchmaker_actions
          GROUP BY action_type
        ) a
      ),
      'successful_matches', (SELECT COUNT(DISTINCT property_id) FROM property_applications WHERE status IN ('approved', 'lease_signed'))
    ),
    
    -- NEW: Subscriptions section
    'subscriptions', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM subscriptions WHERE user_id IS NOT NULL),
      'active', (SELECT COUNT(*) FROM subscriptions WHERE status = 'active'),
      'by_status', (
        SELECT jsonb_object_agg(status, count)
        FROM (
          SELECT status, COUNT(*)::int as count
          FROM subscriptions
          WHERE user_id IS NOT NULL
          GROUP BY status
        ) s
      ),
      'by_plan_type', (
        SELECT jsonb_object_agg(plan_type, count)
        FROM (
          SELECT plan_type, COUNT(*)::int as count
          FROM subscriptions
          WHERE user_id IS NOT NULL
          GROUP BY plan_type
        ) p
      ),
      'total_units', COALESCE((SELECT SUM(subscription_units) FROM subscriptions WHERE status = 'active'), 0),
      'autopay_enabled_count', (SELECT COUNT(*) FROM subscriptions WHERE autopay_enabled = true)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;