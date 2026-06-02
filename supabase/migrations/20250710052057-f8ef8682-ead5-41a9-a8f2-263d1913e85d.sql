-- Fix EXTRACT function issues by ensuring proper type casting
-- Replace the existing get_vacancy_pipeline_metrics function
CREATE OR REPLACE FUNCTION get_vacancy_pipeline_metrics(start_date TEXT DEFAULT NULL, end_date TEXT DEFAULT NULL)
RETURNS TABLE(
  avg_days_on_market NUMERIC,
  current_vacant_units INTEGER,
  current_occupied_units INTEGER,
  new_tenant_profiles_this_period INTEGER,
  vacancy_rate NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
  -- Set default dates if not provided
  IF start_date IS NULL THEN
    start_date := (CURRENT_DATE - INTERVAL '30 days')::TEXT;
  END IF;
  IF end_date IS NULL THEN
    end_date := CURRENT_DATE::TEXT;
  END IF;

  RETURN QUERY
  WITH vacancy_stats AS (
    SELECT 
      p.id,
      p.created_at,
      p.status,
      CASE 
        WHEN p.status = 'available' THEN 
          EXTRACT(DAY FROM (CURRENT_DATE - p.created_at::DATE))::NUMERIC
        ELSE NULL 
      END as days_on_market
    FROM properties p
    WHERE p.created_at::DATE BETWEEN start_date::DATE AND end_date::DATE
      AND p.deleted_at IS NULL
  ),
  current_status AS (
    SELECT 
      COUNT(CASE WHEN status = 'available' THEN 1 END) as vacant,
      COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied,
      COUNT(*) as total
    FROM properties 
    WHERE deleted_at IS NULL
  ),
  tenant_growth AS (
    SELECT COUNT(*) as new_profiles
    FROM tenant_profiles
    WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE
  )
  SELECT 
    COALESCE(AVG(vs.days_on_market), 0)::NUMERIC as avg_days_on_market,
    cs.vacant::INTEGER as current_vacant_units,
    cs.occupied::INTEGER as current_occupied_units,
    tg.new_profiles::INTEGER as new_tenant_profiles_this_period,
    CASE 
      WHEN cs.total > 0 THEN (cs.vacant::NUMERIC / cs.total::NUMERIC * 100)
      ELSE 0 
    END as vacancy_rate
  FROM vacancy_stats vs
  CROSS JOIN current_status cs
  CROSS JOIN tenant_growth tg
  GROUP BY cs.vacant, cs.occupied, cs.total, tg.new_profiles;
END;
$$;

-- Fix other functions with similar EXTRACT issues
CREATE OR REPLACE FUNCTION get_tenant_placement_metrics(start_date TEXT DEFAULT NULL, end_date TEXT DEFAULT NULL)
RETURNS TABLE(
  avg_time_to_placement NUMERIC,
  placement_rate NUMERIC,
  application_conversion_rate NUMERIC,
  total_requests INTEGER,
  filled_requests INTEGER,
  total_applications INTEGER,
  approved_applications INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
  -- Set default dates if not provided
  IF start_date IS NULL THEN
    start_date := (CURRENT_DATE - INTERVAL '30 days')::TEXT;
  END IF;
  IF end_date IS NULL THEN
    end_date := CURRENT_DATE::TEXT;
  END IF;

  RETURN QUERY
  WITH request_stats AS (
    SELECT 
      ptr.id,
      ptr.requested_at,
      ptr.property_id,
      CASE WHEN p.status = 'occupied' THEN ptr.requested_at + INTERVAL '30 days' ELSE NULL END as placement_date
    FROM property_tenant_requests ptr
    JOIN properties p ON ptr.property_id = p.id
    WHERE ptr.requested_at::DATE BETWEEN start_date::DATE AND end_date::DATE
  ),
  placement_times AS (
    SELECT 
      EXTRACT(DAY FROM (placement_date - requested_at))::NUMERIC as days_to_placement
    FROM request_stats 
    WHERE placement_date IS NOT NULL
  ),
  application_stats AS (
    SELECT 
      COUNT(*) as total_apps,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_apps
    FROM property_applications
    WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE
  )
  SELECT 
    COALESCE(AVG(pt.days_to_placement), 0)::NUMERIC as avg_time_to_placement,
    CASE 
      WHEN COUNT(rs.id) > 0 THEN 
        (COUNT(rs.placement_date)::NUMERIC / COUNT(rs.id)::NUMERIC * 100)
      ELSE 0 
    END as placement_rate,
    CASE 
      WHEN apps.total_apps > 0 THEN 
        (apps.approved_apps::NUMERIC / apps.total_apps::NUMERIC * 100)
      ELSE 0 
    END as application_conversion_rate,
    COUNT(rs.id)::INTEGER as total_requests,
    COUNT(rs.placement_date)::INTEGER as filled_requests,
    apps.total_apps::INTEGER as total_applications,
    apps.approved_apps::INTEGER as approved_applications
  FROM request_stats rs
  CROSS JOIN application_stats apps
  LEFT JOIN placement_times pt ON true
  GROUP BY apps.total_apps, apps.approved_apps;
END;
$$;

-- Fix engagement metrics function
CREATE OR REPLACE FUNCTION get_engagement_metrics(start_date TEXT DEFAULT NULL, end_date TEXT DEFAULT NULL)
RETURNS TABLE(
  total_notifications INTEGER,
  total_applications INTEGER,
  total_messages INTEGER,
  total_maintenance_requests INTEGER,
  completed_maintenance_requests INTEGER,
  avg_maintenance_resolution_days NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
  -- Set default dates if not provided
  IF start_date IS NULL THEN
    start_date := (CURRENT_DATE - INTERVAL '30 days')::TEXT;
  END IF;
  IF end_date IS NULL THEN
    end_date := CURRENT_DATE::TEXT;
  END IF;

  RETURN QUERY
  WITH engagement_stats AS (
    SELECT 
      (SELECT COUNT(*) FROM notifications WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE) as notifications,
      (SELECT COUNT(*) FROM property_applications WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE) as applications,
      (SELECT COUNT(*) FROM messages WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE) as messages,
      (SELECT COUNT(*) FROM maintenance_requests WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE) as maintenance_total,
      (SELECT COUNT(*) FROM maintenance_requests WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE AND status = 'completed') as maintenance_completed
  ),
  maintenance_resolution AS (
    SELECT 
      AVG(EXTRACT(DAY FROM (completed_date - created_at))::NUMERIC) as avg_resolution_days
    FROM maintenance_requests 
    WHERE created_at::DATE BETWEEN start_date::DATE AND end_date::DATE
      AND status = 'completed' 
      AND completed_date IS NOT NULL
  )
  SELECT 
    es.notifications::INTEGER,
    es.applications::INTEGER,
    es.messages::INTEGER,
    es.maintenance_total::INTEGER,
    es.maintenance_completed::INTEGER,
    COALESCE(mr.avg_resolution_days, 0)::NUMERIC
  FROM engagement_stats es
  CROSS JOIN maintenance_resolution mr;
END;
$$;