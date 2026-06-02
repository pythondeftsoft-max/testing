-- Drop the existing function
DROP FUNCTION IF EXISTS get_comprehensive_admin_metrics() CASCADE;

-- Create the corrected function with actual table names and columns
CREATE OR REPLACE FUNCTION get_comprehensive_admin_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  properties_data jsonb;
  users_data jsonb;
  applications_data jsonb;
  maintenance_data jsonb;
  financial_data jsonb;
  messages_data jsonb;
  portfolios_data jsonb;
  referrals_data jsonb;
  points_data jsonb;
  matchmaker_data jsonb;
BEGIN
  -- Properties metrics (using correct column: monthly_rent)
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'by_status', (
      SELECT jsonb_object_agg(status, count)
      FROM (
        SELECT status, COUNT(*) as count
        FROM properties
        GROUP BY status
      ) s
    ),
    'by_type', (
      SELECT jsonb_object_agg(property_type, count)
      FROM (
        SELECT property_type, COUNT(*) as count
        FROM properties
        WHERE property_type IS NOT NULL
        GROUP BY property_type
      ) t
    ),
    'average_rent', COALESCE(AVG(monthly_rent), 0)
  )
  INTO properties_data
  FROM properties;

  -- Users metrics (using correct column: user_type)
  SELECT jsonb_build_object(
    'landlords', COUNT(*) FILTER (WHERE user_type = 'landlord'),
    'tenants', COUNT(*) FILTER (WHERE user_type = 'tenant'),
    'total', COUNT(*)
  )
  INTO users_data
  FROM profiles;

  -- Applications metrics (using correct table: property_applications)
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'by_status', (
      SELECT jsonb_object_agg(status, count)
      FROM (
        SELECT status, COUNT(*) as count
        FROM property_applications
        GROUP BY status
      ) s
    ),
    'this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))
  )
  INTO applications_data
  FROM property_applications;

  -- Maintenance metrics (using correct statuses and priorities)
  WITH maintenance_stats AS (
    SELECT 
      COUNT(*) as total,
      AVG(
        CASE 
          WHEN status = 'completed' AND updated_at IS NOT NULL 
          THEN EXTRACT(epoch FROM (updated_at - created_at)) / 86400 
        END
      ) as avg_days
    FROM maintenance_requests
  )
  SELECT jsonb_build_object(
    'total', total,
    'by_status', (
      SELECT jsonb_object_agg(status, count)
      FROM (
        SELECT status, COUNT(*) as count
        FROM maintenance_requests
        GROUP BY status
      ) s
    ),
    'by_priority', (
      SELECT jsonb_object_agg(LOWER(priority), count)
      FROM (
        SELECT LOWER(priority) as priority, COUNT(*) as count
        FROM maintenance_requests
        WHERE priority IS NOT NULL
        GROUP BY LOWER(priority)
      ) p
    ),
    'avg_completion_days', avg_days
  )
  INTO maintenance_data
  FROM maintenance_stats;

  -- Financial metrics (using correct table: rent_payments)
  WITH payment_stats AS (
    SELECT
      SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as collected,
      SUM(CASE WHEN status = 'pending' AND due_date >= CURRENT_DATE THEN amount ELSE 0 END) as pending,
      SUM(CASE WHEN status = 'pending' AND due_date < CURRENT_DATE THEN amount ELSE 0 END) as late,
      COUNT(*) as payment_count
    FROM rent_payments
  )
  SELECT jsonb_build_object(
    'total_collected', COALESCE(collected, 0),
    'total_pending', COALESCE(pending, 0),
    'total_late', COALESCE(late, 0),
    'payment_count', payment_count,
    'collection_rate', 
      CASE 
        WHEN (collected + pending + late) > 0 
        THEN (collected / (collected + pending + late) * 100)
        ELSE 0 
      END
  )
  INTO financial_data
  FROM payment_stats;

  -- Messages metrics (joining with profiles for sender role)
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'this_month', COUNT(*) FILTER (WHERE m.created_at >= date_trunc('month', CURRENT_DATE)),
    'by_sender_role', (
      SELECT jsonb_object_agg(COALESCE(user_type, 'unknown'), count)
      FROM (
        SELECT p.user_type, COUNT(*) as count
        FROM messages m
        LEFT JOIN profiles p ON m.sender_id = p.id
        GROUP BY p.user_type
      ) r
    )
  )
  INTO messages_data
  FROM messages m;

  -- Portfolios metrics (using correct tables)
  WITH portfolio_stats AS (
    SELECT 
      COUNT(DISTINCT p.id) as total_portfolios,
      COUNT(pa.id) as total_assets,
      COUNT(DISTINCT pr.id) as total_properties
    FROM portfolios p
    LEFT JOIN portfolio_assets pa ON pa.portfolio_id = p.id
    LEFT JOIN properties pr ON pr.portfolio_id = p.id
  )
  SELECT jsonb_build_object(
    'total', total_portfolios,
    'total_assets', total_assets,
    'avg_properties', 
      CASE 
        WHEN total_portfolios > 0 
        THEN total_properties::numeric / total_portfolios 
        ELSE 0 
      END
  )
  INTO portfolios_data
  FROM portfolio_stats;

  -- Referrals metrics (using correct statuses)
  WITH referral_stats AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'registered') as registered_count
    FROM referrals
  )
  SELECT jsonb_build_object(
    'total', total,
    'by_status', (
      SELECT jsonb_object_agg(status, count)
      FROM (
        SELECT status, COUNT(*) as count
        FROM referrals
        GROUP BY status
      ) s
    ),
    'conversion_rate',
      CASE 
        WHEN total > 0 
        THEN (registered_count::numeric / total * 100)
        ELSE 0 
      END
  )
  INTO referrals_data
  FROM referral_stats;

  -- Points metrics (using correct table: user_points)
  SELECT jsonb_build_object(
    'total_distributed', COALESCE(SUM(lifetime_earned), 0),
    'active_users', COUNT(*) FILTER (WHERE balance > 0),
    'this_month', COALESCE(SUM(
      CASE 
        WHEN updated_at >= date_trunc('month', CURRENT_DATE) 
        THEN lifetime_earned 
        ELSE 0 
      END
    ), 0)
  )
  INTO points_data
  FROM user_points;

  -- Matchmaker metrics (using correct table: matchmaker_actions)
  SELECT jsonb_build_object(
    'total_interactions', COUNT(*),
    'this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE))
  )
  INTO matchmaker_data
  FROM matchmaker_actions;

  -- Combine all metrics
  result := jsonb_build_object(
    'properties', properties_data,
    'users', users_data,
    'applications', applications_data,
    'maintenance', maintenance_data,
    'financial', financial_data,
    'messages', messages_data,
    'portfolios', portfolios_data,
    'referrals', referrals_data,
    'points', points_data,
    'matchmaker', matchmaker_data
  );

  RETURN result;
END;
$$;