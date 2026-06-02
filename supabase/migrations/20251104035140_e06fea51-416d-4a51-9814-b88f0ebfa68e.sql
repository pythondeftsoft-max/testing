-- Drop and recreate get_unified_activity_feed with correct profile columns
DROP FUNCTION IF EXISTS public.get_unified_activity_feed(text, text, text, text, text, text);

CREATE FUNCTION public.get_unified_activity_feed(
  p_activity_type_filter text DEFAULT NULL,
  p_user_type_filter text DEFAULT NULL,
  p_risk_level_filter text DEFAULT NULL,
  p_status_filter text DEFAULT NULL,
  p_time_range_filter text DEFAULT NULL,
  p_search_query text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  event_timestamp timestamptz,
  user_id uuid,
  user_name text,
  user_email text,
  user_type text,
  activity_type text,
  description text,
  ip_address text,
  location text,
  device text,
  browser text,
  risk_score integer,
  status text,
  source text,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  time_threshold timestamptz;
BEGIN
  -- Calculate time threshold based on filter
  time_threshold := CASE p_time_range_filter
    WHEN 'last_hour' THEN now() - interval '1 hour'
    WHEN 'last_24h' THEN now() - interval '24 hours'
    WHEN 'last_7d' THEN now() - interval '7 days'
    WHEN 'last_30d' THEN now() - interval '30 days'
    WHEN 'last_90d' THEN now() - interval '90 days'
    ELSE '1900-01-01'::timestamptz
  END;

  RETURN QUERY
  WITH rbac_logs AS (
    SELECT 
      rel.id,
      rel.created_at as event_timestamp,
      rel.user_id,
      COALESCE(NULLIF(TRIM(p.first_name || ' ' || p.last_name), ''), p.email, 'Unknown User') as user_name,
      COALESCE(p.email, 'unknown@example.com') as user_email,
      COALESCE(p.user_type, 'user') as user_type,
      rel.action as activity_type,
      CASE 
        WHEN rel.resource_type IS NOT NULL AND rel.resource_id IS NOT NULL THEN
          rel.action || ' on ' || rel.resource_type || ' (ID: ' || rel.resource_id || ')'
        ELSE rel.action
      END as description,
      rel.ip_address,
      rel.location,
      rel.device_info as device,
      rel.user_agent as browser,
      COALESCE(rel.risk_score, 0) as risk_score,
      CASE 
        WHEN rel.risk_score >= 70 THEN 'blocked'
        WHEN rel.risk_score >= 40 THEN 'warning'
        ELSE 'success'
      END as status,
      'rbac' as source,
      rel.metadata
    FROM rbac_event_logs rel
    LEFT JOIN profiles p ON p.id = rel.user_id
    WHERE rel.created_at >= time_threshold
  ),
  account_logs AS (
    SELECT 
      aal.id,
      aal.created_at as event_timestamp,
      aal.user_id,
      COALESCE(NULLIF(TRIM(p.first_name || ' ' || p.last_name), ''), p.email, 'Unknown User') as user_name,
      COALESCE(p.email, 'unknown@example.com') as user_email,
      COALESCE(p.user_type, 'user') as user_type,
      aal.activity_type,
      COALESCE(aal.description, aal.activity_type) as description,
      aal.ip_address,
      NULL as location,
      aal.device_info as device,
      aal.user_agent as browser,
      0 as risk_score,
      COALESCE(aal.status, 'success') as status,
      'account' as source,
      aal.metadata
    FROM account_activity_log aal
    LEFT JOIN profiles p ON p.id = aal.user_id
    WHERE aal.created_at >= time_threshold
  ),
  admin_logs AS (
    SELECT 
      aal.id,
      aal.created_at as event_timestamp,
      aal.admin_id as user_id,
      COALESCE(NULLIF(TRIM(p.first_name || ' ' || p.last_name), ''), p.email, 'Unknown User') as user_name,
      COALESCE(p.email, 'unknown@example.com') as user_email,
      COALESCE(p.user_type, 'admin') as user_type,
      aal.action as activity_type,
      COALESCE(aal.description, aal.action) as description,
      aal.ip_address,
      NULL as location,
      NULL as device,
      NULL as browser,
      0 as risk_score,
      'success' as status,
      'admin' as source,
      aal.details as metadata
    FROM admin_action_logs aal
    LEFT JOIN profiles p ON p.id = aal.admin_id
    WHERE aal.created_at >= time_threshold
  ),
  unified_logs AS (
    SELECT * FROM rbac_logs
    UNION ALL
    SELECT * FROM account_logs
    UNION ALL
    SELECT * FROM admin_logs
  )
  SELECT 
    ul.id,
    ul.event_timestamp,
    ul.user_id,
    ul.user_name,
    ul.user_email,
    ul.user_type,
    ul.activity_type,
    ul.description,
    ul.ip_address,
    ul.location,
    ul.device,
    ul.browser,
    ul.risk_score,
    ul.status,
    ul.source,
    ul.metadata
  FROM unified_logs ul
  WHERE 
    (p_activity_type_filter IS NULL OR ul.activity_type = p_activity_type_filter)
    AND (p_user_type_filter IS NULL OR ul.user_type = p_user_type_filter)
    AND (p_status_filter IS NULL OR ul.status = p_status_filter)
    AND (p_risk_level_filter IS NULL OR 
      CASE p_risk_level_filter
        WHEN 'low' THEN ul.risk_score < 40
        WHEN 'medium' THEN ul.risk_score >= 40 AND ul.risk_score < 70
        WHEN 'high' THEN ul.risk_score >= 70
        ELSE true
      END
    )
    AND (p_search_query IS NULL OR 
      ul.user_name ILIKE '%' || p_search_query || '%' OR
      ul.user_email ILIKE '%' || p_search_query || '%' OR
      ul.activity_type ILIKE '%' || p_search_query || '%' OR
      ul.description ILIKE '%' || p_search_query || '%'
    )
  ORDER BY ul.event_timestamp DESC;
END;
$$;