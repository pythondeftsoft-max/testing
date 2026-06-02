-- Drop the existing function and recreate with correct column mappings
DROP FUNCTION IF EXISTS get_unified_activity_feed(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);

-- Create the unified activity feed function with correct schema mapping
CREATE OR REPLACE FUNCTION get_unified_activity_feed(
  p_activity_type_filter TEXT DEFAULT NULL,
  p_user_type_filter TEXT DEFAULT NULL,
  p_risk_level_filter TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL,
  p_time_range_filter TEXT DEFAULT NULL,
  p_search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  event_timestamp TIMESTAMP WITH TIME ZONE,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_type TEXT,
  activity_type TEXT,
  description TEXT,
  ip_address TEXT,
  location TEXT,
  device TEXT,
  browser TEXT,
  risk_score INTEGER,
  status TEXT,
  source TEXT,
  metadata JSONB
) AS $$
DECLARE
  time_threshold TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate time threshold based on filter
  time_threshold := CASE p_time_range_filter
    WHEN 'last_hour' THEN NOW() - INTERVAL '1 hour'
    WHEN 'last_24h' THEN NOW() - INTERVAL '24 hours'
    WHEN 'last_7d' THEN NOW() - INTERVAL '7 days'
    WHEN 'last_30d' THEN NOW() - INTERVAL '30 days'
    WHEN 'last_90d' THEN NOW() - INTERVAL '90 days'
    ELSE NULL
  END;

  RETURN QUERY
  WITH rbac_logs AS (
    SELECT
      rel.id::TEXT as id,
      rel.created_at as event_timestamp,
      rel.user_id,
      COALESCE(p.full_name, p.email, 'Unknown User') as user_name,
      p.email as user_email,
      COALESCE(p.user_type, 'user') as user_type,
      rel.action as activity_type,
      CASE 
        WHEN rel.allowed THEN 'Accessed ' || rel.object_name
        ELSE 'Blocked attempt to access ' || rel.object_name
      END as description,
      rel.ip_address,
      NULL::TEXT as location,
      NULL::TEXT as device,
      NULL::TEXT as browser,
      COALESCE(rel.risk_score, 0) as risk_score,
      CASE 
        WHEN rel.allowed THEN 'success'
        ELSE 'blocked'
      END as status,
      'rbac'::TEXT as source,
      jsonb_build_object(
        'scope', rel.scope,
        'object_name', rel.object_name,
        'user_agent', rel.user_agent
      ) as metadata
    FROM rbac_event_logs rel
    LEFT JOIN profiles p ON rel.user_id = p.id
    WHERE (time_threshold IS NULL OR rel.created_at >= time_threshold)
  ),
  account_logs AS (
    SELECT
      aal.id::TEXT as id,
      aal.created_at as event_timestamp,
      aal.performed_by as user_id,
      COALESCE(p.full_name, p.email, 'Unknown User') as user_name,
      p.email as user_email,
      COALESCE(p.user_type, 'user') as user_type,
      aal.action_type as activity_type,
      COALESCE(aal.action_type || ': ' || aal.details, aal.action_type) as description,
      aal.ip_address,
      NULL::TEXT as location,
      NULL::TEXT as device,
      NULL::TEXT as browser,
      0 as risk_score,
      'success'::TEXT as status,
      'account'::TEXT as source,
      jsonb_build_object(
        'target_user_id', aal.target_user_id,
        'details', aal.details,
        'user_agent', aal.user_agent
      ) as metadata
    FROM account_activity_log aal
    LEFT JOIN profiles p ON aal.performed_by = p.id
    WHERE (time_threshold IS NULL OR aal.created_at >= time_threshold)
  ),
  admin_logs AS (
    SELECT
      aal.id::TEXT as id,
      aal.created_at as event_timestamp,
      aal.admin_id as user_id,
      COALESCE(p.full_name, p.email, 'Unknown Admin') as user_name,
      p.email as user_email,
      'admin'::TEXT as user_type,
      aal.action as activity_type,
      COALESCE(aal.reason, aal.action || ' on ' || aal.resource_type) as description,
      aal.ip_address,
      NULL::TEXT as location,
      NULL::TEXT as device,
      NULL::TEXT as browser,
      0 as risk_score,
      'success'::TEXT as status,
      'admin'::TEXT as source,
      jsonb_build_object(
        'resource_type', aal.resource_type,
        'resource_id', aal.resource_id,
        'reason', aal.reason
      ) as metadata
    FROM admin_action_logs aal
    LEFT JOIN profiles p ON aal.admin_id = p.id
    WHERE (time_threshold IS NULL OR aal.created_at >= time_threshold)
  ),
  unified AS (
    SELECT * FROM rbac_logs
    UNION ALL
    SELECT * FROM account_logs
    UNION ALL
    SELECT * FROM admin_logs
  )
  SELECT u.*
  FROM unified u
  WHERE (p_activity_type_filter IS NULL OR u.activity_type = p_activity_type_filter)
    AND (p_user_type_filter IS NULL OR u.user_type = p_user_type_filter)
    AND (p_status_filter IS NULL OR u.status = p_status_filter)
    AND (p_risk_level_filter IS NULL OR 
      CASE p_risk_level_filter
        WHEN 'low' THEN u.risk_score < 30
        WHEN 'medium' THEN u.risk_score >= 30 AND u.risk_score < 70
        WHEN 'high' THEN u.risk_score >= 70
      END
    )
    AND (p_search_query IS NULL OR 
      u.user_name ILIKE '%' || p_search_query || '%' OR
      u.user_email ILIKE '%' || p_search_query || '%' OR
      u.description ILIKE '%' || p_search_query || '%'
    )
  ORDER BY u.event_timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;