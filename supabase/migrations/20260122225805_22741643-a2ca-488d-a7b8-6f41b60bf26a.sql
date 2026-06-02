-- Phase 1: Fix log_security_audit_event function conflicts
-- Drop ALL existing versions to ensure clean state
DROP FUNCTION IF EXISTS log_security_audit_event(text, uuid, text, text, text, text, text, jsonb, text);
DROP FUNCTION IF EXISTS log_security_audit_event(text, uuid, text, text, text, inet, text, jsonb, text);

-- Create single, clean version with proper IP handling
CREATE OR REPLACE FUNCTION log_security_audit_event(
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_severity TEXT DEFAULT 'info'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
  v_ip inet;
BEGIN
  -- Safely convert IP if it's a valid IPv4 address
  IF p_ip_address IS NOT NULL AND p_ip_address ~ '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' THEN
    v_ip := p_ip_address::inet;
  ELSE
    v_ip := NULL;
  END IF;

  INSERT INTO security_audit_logs (
    event_type, user_id, resource_type, resource_id,
    action, ip_address, user_agent, metadata, severity
  ) VALUES (
    p_event_type, p_user_id, p_resource_type, p_resource_id,
    p_action, v_ip, p_user_agent, p_metadata, p_severity
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Never fail - just log warning and return null
    RAISE WARNING 'Failed to log security event: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION log_security_audit_event(text, uuid, text, text, text, text, text, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION log_security_audit_event(text, uuid, text, text, text, text, text, jsonb, text) TO anon;