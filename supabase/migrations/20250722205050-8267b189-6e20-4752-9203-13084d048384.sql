
-- Enable pgcrypto extension for hash generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fix the log_security_audit function to properly generate audit hash
CREATE OR REPLACE FUNCTION public.log_security_audit(
  p_event_type text,
  p_user_id uuid DEFAULT NULL,
  p_resource_type text DEFAULT NULL,
  p_resource_id text DEFAULT NULL,
  p_action text DEFAULT 'audit',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}',
  p_severity text DEFAULT 'info'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  audit_id uuid;
  audit_hash text;
BEGIN
  -- Generate unique audit ID
  audit_id := gen_random_uuid();
  
  -- Generate audit hash using available data
  audit_hash := encode(
    digest(
      concat(
        audit_id::text,
        p_event_type,
        COALESCE(p_user_id::text, ''),
        COALESCE(p_resource_type, ''),
        COALESCE(p_resource_id, ''),
        p_action,
        extract(epoch from now())::text
      ),
      'sha256'
    ),
    'hex'
  );
  
  -- Insert audit log entry
  INSERT INTO public.enterprise_security_audit (
    id,
    event_type,
    user_id,
    resource_type,
    resource_id,
    action,
    ip_address,
    user_agent,
    metadata,
    severity,
    hash,
    created_at
  ) VALUES (
    audit_id,
    p_event_type,
    p_user_id,
    p_resource_type,
    p_resource_id,
    p_action,
    p_ip_address,
    p_user_agent,
    p_metadata,
    p_severity,
    audit_hash,
    now()
  );
  
  RETURN audit_id;
END;
$$;

-- Create function to check and log rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_max_requests integer DEFAULT 100,
  p_window_hours integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  request_count integer;
  window_start timestamp with time zone;
BEGIN
  -- Calculate window start time
  window_start := now() - (p_window_hours || ' hours')::interval;
  
  -- Count requests in the current window
  SELECT COUNT(*) INTO request_count
  FROM public.enterprise_security_audit
  WHERE metadata->>'identifier' = p_identifier
    AND metadata->>'endpoint' = p_endpoint
    AND created_at >= window_start;
  
  -- Log the rate limit check
  PERFORM public.log_security_audit(
    'rate_limit_check',
    NULL,
    'rate_limit',
    p_identifier,
    'check',
    NULL,
    NULL,
    jsonb_build_object(
      'identifier', p_identifier,
      'endpoint', p_endpoint,
      'current_count', request_count,
      'max_requests', p_max_requests,
      'window_hours', p_window_hours
    ),
    CASE WHEN request_count >= p_max_requests THEN 'high' ELSE 'info' END
  );
  
  -- Return true if under limit, false if over
  RETURN request_count < p_max_requests;
END;
$$;

-- Create function to create security incidents
CREATE OR REPLACE FUNCTION public.create_security_incident(
  p_incident_type text,
  p_severity text,
  p_title text,
  p_description text DEFAULT NULL,
  p_affected_user_id uuid DEFAULT NULL,
  p_detection_method text DEFAULT 'automated',
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  incident_id uuid;
BEGIN
  -- Create security incident
  INSERT INTO public.security_incidents (
    incident_type,
    severity,
    title,
    description,
    affected_user_id,
    detection_method,
    metadata,
    status
  ) VALUES (
    p_incident_type,
    p_severity,
    p_title,
    p_description,
    p_affected_user_id,
    p_detection_method,
    p_metadata,
    'open'
  ) RETURNING id INTO incident_id;
  
  -- Log the incident creation
  PERFORM public.log_security_audit(
    'security_incident_created',
    p_affected_user_id,
    'security_incident',
    incident_id::text,
    'create',
    NULL,
    NULL,
    jsonb_build_object(
      'incident_type', p_incident_type,
      'severity', p_severity,
      'title', p_title,
      'detection_method', p_detection_method
    ),
    p_severity
  );
  
  RETURN incident_id;
END;
$$;

-- Insert some sample audit data for testing
INSERT INTO public.enterprise_security_audit (
  event_type,
  user_id,
  resource_type,
  resource_id,
  action,
  ip_address,
  user_agent,
  metadata,
  severity,
  hash,
  created_at
) VALUES 
(
  'user_login',
  '84b46bc8-1e8a-4f74-9349-0f765b364018',
  'auth_session',
  gen_random_uuid()::text,
  'authenticate',
  '192.168.1.100'::inet,
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  '{"login_method": "email", "success": true}',
  'info',
  encode(digest('sample_hash_1', 'sha256'), 'hex'),
  now() - interval '5 minutes'
),
(
  'failed_login_attempt',
  NULL,
  'auth_session',
  gen_random_uuid()::text,
  'authenticate',
  '10.0.0.1'::inet,
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  '{"login_method": "email", "success": false, "reason": "invalid_credentials"}',
  'medium',
  encode(digest('sample_hash_2', 'sha256'), 'hex'),
  now() - interval '3 minutes'
),
(
  'admin_property_access',
  '84b46bc8-1e8a-4f74-9349-0f765b364018',
  'property',
  gen_random_uuid()::text,
  'view',
  '172.16.0.1'::inet,
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  '{"access_type": "admin_dashboard", "resource_count": 1}',
  'low',
  encode(digest('sample_hash_3', 'sha256'), 'hex'),
  now() - interval '1 minute'
),
(
  'rate_limit_exceeded',
  NULL,
  'api_endpoint',
  '/api/properties',
  'rate_limit_check',
  '203.0.113.1'::inet,
  'curl/7.68.0',
  '{"endpoint": "/api/properties", "requests_per_hour": 150, "limit": 100}',
  'high',
  encode(digest('sample_hash_4', 'sha256'), 'hex'),
  now() - interval '30 seconds'
),
(
  'suspicious_login_pattern',
  NULL,
  'auth_session',
  gen_random_uuid()::text,
  'detect_anomaly',
  '198.51.100.1'::inet,
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
  '{"login_attempts": 5, "time_window": "15_minutes", "countries": ["US", "RU"]}',
  'critical',
  encode(digest('sample_hash_5', 'sha256'), 'hex'),
  now() - interval '10 seconds'
);
