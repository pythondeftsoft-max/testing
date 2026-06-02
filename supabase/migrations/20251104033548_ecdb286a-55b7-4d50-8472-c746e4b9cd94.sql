-- Update get_unified_activity_feed function to use valid enum values
CREATE OR REPLACE FUNCTION get_unified_activity_feed(
  p_user_type_filter TEXT DEFAULT NULL,
  p_activity_type_filter TEXT DEFAULT NULL,
  p_time_range_filter TEXT DEFAULT NULL,
  p_risk_level_filter TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT NULL,
  p_search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  event_timestamp TIMESTAMPTZ,
  user_id UUID,
  user_name TEXT,
  user_type user_type,
  activity_type TEXT,
  description TEXT,
  risk_score INTEGER,
  status TEXT,
  source TEXT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH rbac_logs AS (
    SELECT 
      rel.id,
      rel.timestamp as event_timestamp,
      rel.user_id,
      COALESCE(p.full_name, 'Unknown User') as user_name,
      CASE 
        WHEN p.user_type IS NOT NULL THEN p.user_type
        ELSE 'tenant'::user_type
      END as user_type,
      rel.event_type as activity_type,
      rel.description,
      CASE 
        WHEN rel.event_type IN ('access_denied', 'permission_violation') THEN 80
        WHEN rel.event_type IN ('role_changed', 'permission_granted') THEN 60
        ELSE 30
      END as risk_score,
      rel.status,
      'rbac' as source,
      rel.metadata
    FROM rbac_event_logs rel
    LEFT JOIN profiles p ON rel.user_id = p.id
  ),
  account_logs AS (
    SELECT 
      aal.id,
      aal.timestamp as event_timestamp,
      aal.user_id,
      COALESCE(p.full_name, 'Unknown User') as user_name,
      CASE 
        WHEN p.user_type IS NOT NULL THEN p.user_type
        ELSE 'tenant'::user_type
      END as user_type,
      aal.action_type as activity_type,
      aal.description,
      CASE 
        WHEN aal.action_type IN ('login_failed', 'password_reset') THEN 70
        WHEN aal.action_type IN ('profile_updated', 'settings_changed') THEN 40
        ELSE 20
      END as risk_score,
      'success' as status,
      'account' as source,
      aal.metadata
    FROM account_activity_log aal
    LEFT JOIN profiles p ON aal.user_id = p.id
  ),
  admin_logs AS (
    SELECT 
      aal.id,
      aal.timestamp as event_timestamp,
      aal.admin_user_id as user_id,
      COALESCE(p.full_name, 'Admin User') as user_name,
      'admin'::user_type as user_type,
      aal.action_type as activity_type,
      aal.description,
      CASE 
        WHEN aal.action_type IN ('user_deleted', 'system_config_changed') THEN 90
        WHEN aal.action_type IN ('user_suspended', 'role_modified') THEN 70
        ELSE 50
      END as risk_score,
      'success' as status,
      'admin' as source,
      aal.metadata
    FROM admin_action_logs aal
    LEFT JOIN profiles p ON aal.admin_user_id = p.id
  ),
  unified AS (
    SELECT * FROM rbac_logs
    UNION ALL
    SELECT * FROM account_logs
    UNION ALL
    SELECT * FROM admin_logs
  )
  SELECT 
    u.id,
    u.event_timestamp,
    u.user_id,
    u.user_name,
    u.user_type,
    u.activity_type,
    u.description,
    u.risk_score,
    u.status,
    u.source,
    u.metadata
  FROM unified u
  WHERE 
    (p_user_type_filter IS NULL OR u.user_type::TEXT = p_user_type_filter)
    AND (p_activity_type_filter IS NULL OR u.activity_type = p_activity_type_filter)
    AND (p_time_range_filter IS NULL OR 
      CASE p_time_range_filter
        WHEN 'last_hour' THEN u.event_timestamp >= NOW() - INTERVAL '1 hour'
        WHEN 'last_24h' THEN u.event_timestamp >= NOW() - INTERVAL '24 hours'
        WHEN 'last_7d' THEN u.event_timestamp >= NOW() - INTERVAL '7 days'
        WHEN 'last_30d' THEN u.event_timestamp >= NOW() - INTERVAL '30 days'
        ELSE TRUE
      END
    )
    AND (p_risk_level_filter IS NULL OR 
      CASE p_risk_level_filter
        WHEN 'low' THEN u.risk_score < 40
        WHEN 'medium' THEN u.risk_score >= 40 AND u.risk_score < 70
        WHEN 'high' THEN u.risk_score >= 70
        ELSE TRUE
      END
    )
    AND (p_status_filter IS NULL OR u.status = p_status_filter)
    AND (p_search_query IS NULL OR 
      u.user_name ILIKE '%' || p_search_query || '%' OR
      u.activity_type ILIKE '%' || p_search_query || '%' OR
      u.description ILIKE '%' || p_search_query || '%'
    )
  ORDER BY u.event_timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;