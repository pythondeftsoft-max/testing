-- Fix critical database security issues

-- 1. Add missing RLS policy for compliance_checklist table
ALTER TABLE public.compliance_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage compliance checklist" 
ON public.compliance_checklist 
FOR ALL 
USING (is_admin(auth.uid()));

-- 2. Secure database functions by adding SET search_path = ''
-- Update critical functions to prevent injection attacks

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_active_subscription(user_id uuid, subscription_role text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions 
    WHERE user_id = $1 
    AND status = 'active'
    AND (subscription_role IS NULL OR role = subscription_role)
    AND (current_period_end IS NULL OR current_period_end > NOW())
  );
$function$;

CREATE OR REPLACE FUNCTION public.count_landlord_properties(landlord_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT COUNT(*)::INTEGER
  FROM public.properties 
  WHERE owner_id = landlord_id 
    AND deleted_at IS NULL 
    AND status != 'deleted';
$function$;

CREATE OR REPLACE FUNCTION public.calculate_billable_units(landlord_id uuid, free_tier integer DEFAULT 10)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT GREATEST(0, count_landlord_properties(landlord_id) - free_tier);
$function$;

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

-- 4. Create security audit logs table for rate limiting
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

CREATE POLICY "Security admins can view audit logs"
ON public.security_audit_logs
FOR SELECT
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "System can insert audit logs"
ON public.security_audit_logs
FOR INSERT
WITH CHECK (true);

-- 5. Create RPC function for safe security audit logging
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