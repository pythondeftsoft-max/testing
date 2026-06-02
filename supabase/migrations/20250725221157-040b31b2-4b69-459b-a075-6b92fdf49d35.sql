-- Security hardening: Fix critical database functions with proper search_path
-- This addresses the security vulnerability where functions lack proper search_path isolation

-- Fix log_security_audit function to use proper search_path
CREATE OR REPLACE FUNCTION public.log_security_audit(
  p_event_type text, 
  p_user_id uuid DEFAULT NULL, 
  p_resource_type text DEFAULT NULL, 
  p_resource_id text DEFAULT NULL, 
  p_action text DEFAULT NULL, 
  p_ip_address text DEFAULT NULL, 
  p_user_agent text DEFAULT NULL, 
  p_metadata jsonb DEFAULT '{}', 
  p_severity text DEFAULT 'info'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  audit_id uuid;
  safe_event_type text;
  safe_resource_type text;
  safe_resource_id text;
  safe_action text;
  safe_user_agent text;
  safe_severity text;
BEGIN
  -- Input validation and sanitization
  safe_event_type := COALESCE(TRIM(p_event_type), 'unknown_event');
  safe_resource_type := CASE WHEN p_resource_type IS NOT NULL THEN TRIM(p_resource_type) ELSE NULL END;
  safe_resource_id := CASE WHEN p_resource_id IS NOT NULL THEN TRIM(p_resource_id) ELSE NULL END;
  safe_action := COALESCE(TRIM(p_action), 'audit');
  safe_user_agent := CASE WHEN p_user_agent IS NOT NULL THEN LEFT(TRIM(p_user_agent), 500) ELSE NULL END;
  safe_severity := CASE 
    WHEN p_severity IN ('low', 'info', 'medium', 'high', 'critical') THEN p_severity 
    ELSE 'info' 
  END;

  -- Validate event type format (alphanumeric, underscore, hyphen only)
  IF safe_event_type !~ '^[a-zA-Z0-9_\-]+$' THEN
    safe_event_type := 'sanitized_event';
  END IF;

  -- Insert audit log with validated data
  INSERT INTO public.security_audit_logs (
    user_id,
    event_type,
    ip_address,
    user_agent,
    metadata,
    severity
  ) VALUES (
    p_user_id,
    safe_event_type,
    p_ip_address::inet,
    safe_user_agent,
    COALESCE(p_metadata, '{}') || jsonb_build_object(
      'resource_type', safe_resource_type,
      'resource_id', safe_resource_id,
      'action', safe_action,
      'audit_timestamp', now()
    ),
    safe_severity
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

-- Fix check_rate_limit function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid, 
  p_action_type text, 
  p_max_attempts integer DEFAULT 5, 
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  attempt_count integer;
  safe_action_type text;
BEGIN
  -- Input validation
  safe_action_type := COALESCE(TRIM(p_action_type), 'unknown');
  
  -- Validate action type format
  IF safe_action_type !~ '^[a-zA-Z0-9_\-]+$' THEN
    safe_action_type := 'sanitized_action';
  END IF;

  -- Ensure reasonable limits
  p_max_attempts := GREATEST(1, LEAST(p_max_attempts, 100));
  p_window_minutes := GREATEST(1, LEAST(p_window_minutes, 1440)); -- Max 24 hours
  
  -- Count attempts in the time window
  SELECT COUNT(*) INTO attempt_count
  FROM public.security_audit_logs
  WHERE user_id = p_user_id
    AND event_type = safe_action_type
    AND created_at > NOW() - (p_window_minutes || ' minutes')::interval;
  
  -- Return false if rate limit exceeded
  RETURN attempt_count < p_max_attempts;
END;
$$;

-- Add function to clean up old security logs (data retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_security_logs(days_to_keep integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Ensure reasonable retention period
  days_to_keep := GREATEST(7, LEAST(days_to_keep, 2555)); -- Min 7 days, max 7 years
  
  -- Delete old logs except critical ones
  WITH deleted AS (
    DELETE FROM public.security_audit_logs 
    WHERE created_at < NOW() - (days_to_keep || ' days')::interval
    AND severity NOT IN ('critical', 'high')
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$;

-- Create enhanced rate limiting function with better security
CREATE OR REPLACE FUNCTION public.enhanced_rate_limit_check(
  p_identifier text,
  p_action_type text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15,
  p_block_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  attempt_count integer;
  blocked_until timestamp with time zone;
  safe_identifier text;
  safe_action_type text;
  result jsonb;
BEGIN
  -- Input validation and sanitization
  safe_identifier := COALESCE(TRIM(p_identifier), 'unknown');
  safe_action_type := COALESCE(TRIM(p_action_type), 'unknown');
  
  -- Validate formats
  IF safe_identifier !~ '^[a-zA-Z0-9_\-\.@]+$' THEN
    safe_identifier := 'sanitized_id';
  END IF;
  
  IF safe_action_type !~ '^[a-zA-Z0-9_\-]+$' THEN
    safe_action_type := 'sanitized_action';
  END IF;

  -- Ensure reasonable limits
  p_max_attempts := GREATEST(1, LEAST(p_max_attempts, 100));
  p_window_minutes := GREATEST(1, LEAST(p_window_minutes, 1440));
  p_block_minutes := GREATEST(1, LEAST(p_block_minutes, 1440));

  -- Check for existing blocks
  SELECT metadata->>'blocked_until' INTO blocked_until
  FROM public.security_audit_logs
  WHERE event_type = 'rate_limit_block'
    AND metadata->>'identifier' = safe_identifier
    AND metadata->>'action_type' = safe_action_type
    AND created_at > NOW() - (p_block_minutes || ' minutes')::interval
  ORDER BY created_at DESC
  LIMIT 1;

  -- If currently blocked
  IF blocked_until IS NOT NULL AND blocked_until > NOW() THEN
    result := jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limited',
      'blocked_until', blocked_until,
      'remaining_attempts', 0
    );
    RETURN result;
  END IF;

  -- Count recent attempts
  SELECT COUNT(*) INTO attempt_count
  FROM public.security_audit_logs
  WHERE metadata->>'identifier' = safe_identifier
    AND metadata->>'action_type' = safe_action_type
    AND created_at > NOW() - (p_window_minutes || ' minutes')::interval;

  -- Check if limit exceeded
  IF attempt_count >= p_max_attempts THEN
    -- Create block record
    blocked_until := NOW() + (p_block_minutes || ' minutes')::interval;
    
    INSERT INTO public.security_audit_logs (
      event_type,
      severity,
      metadata
    ) VALUES (
      'rate_limit_block',
      'medium',
      jsonb_build_object(
        'identifier', safe_identifier,
        'action_type', safe_action_type,
        'attempt_count', attempt_count,
        'blocked_until', blocked_until
      )
    );

    result := jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'blocked_until', blocked_until,
      'remaining_attempts', 0
    );
  ELSE
    result := jsonb_build_object(
      'allowed', true,
      'remaining_attempts', p_max_attempts - attempt_count - 1
    );
  END IF;

  RETURN result;
END;
$$;