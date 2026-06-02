-- Fix critical database security issues - Step 1: Core functions first

-- 1. Add missing RLS policy for compliance_checklist table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_checklist') THEN
    ALTER TABLE public.compliance_checklist ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Admins can manage compliance checklist" ON public.compliance_checklist;
    CREATE POLICY "Admins can manage compliance checklist" 
    ON public.compliance_checklist 
    FOR ALL 
    USING (is_admin(auth.uid()));
  END IF;
END $$;

-- 2. Create security audit logs table for rate limiting
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event_type text NOT NULL,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  severity text DEFAULT 'info',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security audit logs
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Security admins can view audit logs" ON public.security_audit_logs;
CREATE POLICY "Security admins can view audit logs"
ON public.security_audit_logs
FOR SELECT
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

DROP POLICY IF EXISTS "System can insert audit logs" ON public.security_audit_logs;
CREATE POLICY "System can insert audit logs"
ON public.security_audit_logs
FOR INSERT
WITH CHECK (true);

-- 3. Create secure rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_action_type text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  attempt_count integer;
BEGIN
  -- Count attempts in the time window
  SELECT COUNT(*) INTO attempt_count
  FROM public.security_audit_logs
  WHERE user_id = p_user_id
    AND event_type = p_action_type
    AND created_at > NOW() - (p_window_minutes || ' minutes')::interval;
  
  -- Return false if rate limit exceeded
  RETURN attempt_count < p_max_attempts;
END;
$function$;

-- 4. Create RPC function for safe security audit logging
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
SET search_path = ''
AS $function$
DECLARE
  audit_id uuid;
BEGIN
  INSERT INTO public.security_audit_logs (
    user_id,
    event_type,
    ip_address,
    user_agent,
    metadata,
    severity
  ) VALUES (
    p_user_id,
    p_event_type,
    p_ip_address::inet,
    p_user_agent,
    p_metadata || jsonb_build_object(
      'resource_type', p_resource_type,
      'resource_id', p_resource_id,
      'action', p_action
    ),
    p_severity
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$function$;