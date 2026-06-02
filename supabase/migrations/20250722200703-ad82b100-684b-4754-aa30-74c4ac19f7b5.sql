-- Phase 5.1 Continued: Enterprise Security Functions

-- 1. Create function to log security audit events with hash integrity
CREATE OR REPLACE FUNCTION public.log_security_audit(
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_action TEXT DEFAULT 'unknown',
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_severity TEXT DEFAULT 'info'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_id UUID;
  v_hash_input TEXT;
  v_hash TEXT;
BEGIN
  -- Generate audit record ID
  v_audit_id := gen_random_uuid();
  
  -- Create hash input for integrity verification
  v_hash_input := v_audit_id::TEXT || p_event_type || COALESCE(p_user_id::TEXT, '') || 
                  COALESCE(p_resource_type, '') || COALESCE(p_resource_id, '') || p_action ||
                  COALESCE(p_ip_address::TEXT, '') || now()::TEXT;
  
  -- Generate SHA-256 hash for immutable audit trail
  v_hash := encode(digest(v_hash_input, 'sha256'), 'hex');
  
  -- Insert audit record
  INSERT INTO public.enterprise_security_audit (
    id, event_type, user_id, resource_type, resource_id, action,
    ip_address, user_agent, metadata, severity, hash
  ) VALUES (
    v_audit_id, p_event_type, p_user_id, p_resource_type, p_resource_id, p_action,
    p_ip_address, p_user_agent, p_metadata, p_severity, v_hash
  );
  
  RETURN v_audit_id;
END;
$$;

-- 2. Create function to manage user sessions with risk scoring
CREATE OR REPLACE FUNCTION public.create_user_session(
  p_user_id UUID,
  p_session_token TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_location_data JSONB DEFAULT '{}',
  p_device_fingerprint TEXT DEFAULT NULL,
  p_expires_in_hours INTEGER DEFAULT 24
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_risk_score INTEGER := 0;
  v_expires_at TIMESTAMP WITH TIME ZONE;
BEGIN
  v_session_id := gen_random_uuid();
  v_expires_at := now() + (p_expires_in_hours || ' hours')::INTERVAL;
  
  -- Calculate basic risk score
  IF p_ip_address IS NULL THEN
    v_risk_score := v_risk_score + 20;
  END IF;
  
  IF p_device_fingerprint IS NULL THEN
    v_risk_score := v_risk_score + 10;
  END IF;
  
  -- Check for suspicious activity (multiple sessions from different IPs)
  IF EXISTS (
    SELECT 1 FROM public.user_sessions 
    WHERE user_id = p_user_id 
    AND is_active = true 
    AND ip_address != p_ip_address
    AND created_at > now() - INTERVAL '1 hour'
  ) THEN
    v_risk_score := v_risk_score + 30;
  END IF;
  
  -- Insert session record
  INSERT INTO public.user_sessions (
    id, user_id, session_token, ip_address, user_agent,
    location_data, device_fingerprint, expires_at, risk_score
  ) VALUES (
    v_session_id, p_user_id, p_session_token, p_ip_address, p_user_agent,
    p_location_data, p_device_fingerprint, v_expires_at, v_risk_score
  );
  
  -- Log security audit event
  PERFORM public.log_security_audit(
    'session_created',
    p_user_id,
    'user_session',
    v_session_id::TEXT,
    'create',
    p_ip_address,
    p_user_agent,
    jsonb_build_object('risk_score', v_risk_score),
    CASE WHEN v_risk_score > 50 THEN 'high' WHEN v_risk_score > 25 THEN 'medium' ELSE 'low' END
  );
  
  RETURN v_session_id;
END;
$$;

-- 3. Create function to check and enforce API rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_hours INTEGER DEFAULT 1
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_count INTEGER;
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_window_duration INTERVAL;
BEGIN
  v_window_duration := (p_window_hours || ' hours')::INTERVAL;
  v_window_start := date_trunc('hour', now()) - (date_part('hour', now())::INTEGER % p_window_hours || ' hours')::INTERVAL;
  
  -- Get current request count for this window
  SELECT COALESCE(requests_count, 0) INTO v_current_count
  FROM public.api_rate_limits
  WHERE identifier = p_identifier
  AND endpoint = p_endpoint
  AND window_start = v_window_start;
  
  -- Check if limit exceeded
  IF v_current_count >= p_max_requests THEN
    -- Update limit exceeded flag
    UPDATE public.api_rate_limits
    SET limit_exceeded = true, updated_at = now()
    WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start = v_window_start;
    
    -- Log security audit event
    PERFORM public.log_security_audit(
      'rate_limit_exceeded',
      NULL,
      'api_endpoint',
      p_endpoint,
      'access_denied',
      NULL,
      NULL,
      jsonb_build_object('identifier', p_identifier, 'requests', v_current_count, 'limit', p_max_requests),
      'medium'
    );
    
    RETURN FALSE;
  END IF;
  
  -- Update or insert request count
  INSERT INTO public.api_rate_limits (identifier, endpoint, window_start, window_duration, requests_count)
  VALUES (p_identifier, p_endpoint, v_window_start, v_window_duration, 1)
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET requests_count = api_rate_limits.requests_count + 1, updated_at = now();
  
  RETURN TRUE;
END;
$$;

-- 4. Create function to detect and create security incidents
CREATE OR REPLACE FUNCTION public.create_security_incident(
  p_incident_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_affected_user_id UUID DEFAULT NULL,
  p_detection_method TEXT DEFAULT 'automated',
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_incident_id UUID;
BEGIN
  v_incident_id := gen_random_uuid();
  
  INSERT INTO public.security_incidents (
    id, incident_type, severity, title, description,
    affected_user_id, detection_method, metadata
  ) VALUES (
    v_incident_id, p_incident_type, p_severity, p_title, p_description,
    p_affected_user_id, p_detection_method, p_metadata
  );
  
  -- Log security audit event
  PERFORM public.log_security_audit(
    'security_incident_created',
    p_affected_user_id,
    'security_incident',
    v_incident_id::TEXT,
    'create',
    NULL,
    NULL,
    jsonb_build_object('incident_type', p_incident_type, 'severity', p_severity),
    p_severity
  );
  
  RETURN v_incident_id;
END;
$$;

-- 5. Create function to manage compliance checklist
CREATE OR REPLACE FUNCTION public.update_compliance_control(
  p_framework TEXT,
  p_control_id TEXT,
  p_implementation_status TEXT,
  p_evidence_urls TEXT[] DEFAULT NULL,
  p_responsible_party UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.compliance_checklist
  SET implementation_status = p_implementation_status,
      evidence_urls = COALESCE(p_evidence_urls, evidence_urls),
      responsible_party = COALESCE(p_responsible_party, responsible_party),
      last_reviewed_at = now(),
      next_review_due = now() + INTERVAL '90 days',
      updated_at = now()
  WHERE framework = p_framework AND control_id = p_control_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Log audit event
  PERFORM public.log_security_audit(
    'compliance_control_updated',
    auth.uid(),
    'compliance_control',
    p_framework || ':' || p_control_id,
    'update',
    NULL,
    NULL,
    jsonb_build_object('status', p_implementation_status, 'framework', p_framework),
    'info'
  );
  
  RETURN TRUE;
END;
$$;

-- 6. Create function to get enterprise security dashboard data
CREATE OR REPLACE FUNCTION public.get_enterprise_security_dashboard()
RETURNS TABLE(
  active_incidents INTEGER,
  critical_incidents INTEGER,
  high_risk_sessions INTEGER,
  rate_limit_violations INTEGER,
  compliance_score NUMERIC,
  recent_security_events INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH incident_stats AS (
    SELECT 
      COUNT(CASE WHEN status != 'resolved' THEN 1 END) as active,
      COUNT(CASE WHEN severity = 'critical' AND status != 'resolved' THEN 1 END) as critical
    FROM public.security_incidents
    WHERE created_at > now() - INTERVAL '30 days'
  ),
  session_stats AS (
    SELECT COUNT(*) as high_risk
    FROM public.user_sessions
    WHERE is_active = true AND risk_score > 50
  ),
  rate_limit_stats AS (
    SELECT COUNT(*) as violations
    FROM public.api_rate_limits
    WHERE limit_exceeded = true
    AND created_at > now() - INTERVAL '24 hours'
  ),
  compliance_stats AS (
    SELECT 
      ROUND(
        (COUNT(CASE WHEN implementation_status = 'implemented' THEN 1 END)::NUMERIC / 
         NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 2
      ) as score
    FROM public.compliance_checklist
  ),
  security_events AS (
    SELECT COUNT(*) as recent_events
    FROM public.enterprise_security_audit
    WHERE created_at > now() - INTERVAL '24 hours'
    AND severity IN ('medium', 'high', 'critical')
  )
  SELECT 
    COALESCE(i.active, 0)::INTEGER,
    COALESCE(i.critical, 0)::INTEGER,
    COALESCE(s.high_risk, 0)::INTEGER,
    COALESCE(r.violations, 0)::INTEGER,
    COALESCE(c.score, 0),
    COALESCE(e.recent_events, 0)::INTEGER
  FROM incident_stats i
  CROSS JOIN session_stats s
  CROSS JOIN rate_limit_stats r
  CROSS JOIN compliance_stats c
  CROSS JOIN security_events e;
END;
$$;

-- 7. Create function to clean up expired sessions and rate limits
CREATE OR REPLACE FUNCTION public.cleanup_expired_security_data()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cleaned_count INTEGER := 0;
BEGIN
  -- Clean up expired sessions
  DELETE FROM public.user_sessions
  WHERE expires_at < now() OR (is_active = false AND updated_at < now() - INTERVAL '7 days');
  
  GET DIAGNOSTICS v_cleaned_count = ROW_COUNT;
  
  -- Clean up old rate limit windows
  DELETE FROM public.api_rate_limits
  WHERE window_start < now() - INTERVAL '7 days';
  
  -- Clean up old audit logs (keep for 1 year)
  DELETE FROM public.enterprise_security_audit
  WHERE created_at < now() - INTERVAL '1 year';
  
  RETURN v_cleaned_count;
END;
$$;