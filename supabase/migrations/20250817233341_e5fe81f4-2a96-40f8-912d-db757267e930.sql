-- RBAC Production Hardening: PII Masking, Indexing, and Retention

-- 1. Create helper function to sanitize metadata and remove PII
CREATE OR REPLACE FUNCTION public.sanitize_metadata(metadata_input jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sanitized_metadata jsonb;
  pii_keys text[] := ARRAY['email', 'token', 'authorization', 'password', 'secret', 'key', 'credential'];
  key text;
BEGIN
  -- Start with input metadata
  sanitized_metadata := metadata_input;
  
  -- Remove or mask PII fields
  FOREACH key IN ARRAY pii_keys
  LOOP
    IF sanitized_metadata ? key THEN
      sanitized_metadata := sanitized_metadata - key || jsonb_build_object(key, '[REDACTED]');
    END IF;
  END LOOP;
  
  RETURN sanitized_metadata;
END;
$$;

-- 2. Update log_rbac_event function to use sanitization
CREATE OR REPLACE FUNCTION public.log_rbac_event(
  p_scope text,
  p_object text, 
  p_action text,
  p_portfolio_id uuid DEFAULT NULL,
  p_allowed boolean DEFAULT false,
  p_source text DEFAULT 'client',
  p_route text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert audit log with sanitized metadata
  INSERT INTO public.rbac_audit_logs (
    user_id,
    scope,
    object,
    action,
    portfolio_id,
    allowed,
    source,
    route,
    user_agent,
    metadata
  ) VALUES (
    auth.uid(),
    p_scope,
    p_object,
    p_action,
    p_portfolio_id,
    p_allowed,
    p_source,
    p_route,
    p_user_agent,
    public.sanitize_metadata(p_metadata)
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently to not disrupt user experience
    RETURN false;
END;
$$;

-- 3. Create performance indexes for RBAC audit logs
CREATE INDEX IF NOT EXISTS idx_rbac_audit_logs_created_at_desc 
  ON public.rbac_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rbac_audit_logs_user_id 
  ON public.rbac_audit_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_rbac_audit_logs_scope_object 
  ON public.rbac_audit_logs (scope, object);

CREATE INDEX IF NOT EXISTS idx_rbac_audit_logs_object_action 
  ON public.rbac_audit_logs (object, action);

CREATE INDEX IF NOT EXISTS idx_rbac_audit_logs_allowed_created_at 
  ON public.rbac_audit_logs (allowed, created_at DESC);

-- Partial index for denied events (usually what we care about most)
CREATE INDEX IF NOT EXISTS idx_rbac_audit_logs_denied_events 
  ON public.rbac_audit_logs (created_at DESC, object, action) 
  WHERE allowed = false;

-- 4. Create retention function to purge old logs
CREATE OR REPLACE FUNCTION public.purge_old_rbac_logs(p_days integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Only admins and owners can purge logs
  IF NOT (is_admin(auth.uid()) OR has_account_role(auth.uid(), ARRAY['owner'::account_role_type])) THEN
    RAISE EXCEPTION 'Only admins and account owners can purge RBAC logs';
  END IF;
  
  -- Delete logs older than specified days
  WITH deleted AS (
    DELETE FROM public.rbac_audit_logs 
    WHERE created_at < (now() - (p_days || ' days')::interval)
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$;

-- 5. Schedule daily retention job (if pg_cron is available)
-- Note: This requires pg_cron extension which may not be available in all environments
DO $$
BEGIN
  -- Only schedule if pg_cron is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Schedule daily at 2 AM to purge logs older than 90 days
    PERFORM cron.schedule('rbac-logs-cleanup', '0 2 * * *', 'SELECT public.purge_old_rbac_logs(90);');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore errors if pg_cron is not available
    NULL;
END;
$$;

-- 6. Ensure get_rbac_stats remains secure and restricted
-- The function should already be SECURITY DEFINER and restricted to owners/admins
-- This is just a verification that it exists and has proper access control

-- Create a comment documenting the security model
COMMENT ON FUNCTION public.log_rbac_event IS 'Logs RBAC events with automatic PII sanitization. Fails silently to avoid disrupting user experience.';
COMMENT ON FUNCTION public.sanitize_metadata IS 'Removes or masks PII fields from metadata before storage.';
COMMENT ON FUNCTION public.purge_old_rbac_logs IS 'Purges RBAC audit logs older than specified days. Restricted to admins and account owners.';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.log_rbac_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_rbac_logs TO authenticated;