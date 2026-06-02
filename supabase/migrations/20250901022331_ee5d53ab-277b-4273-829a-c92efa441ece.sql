-- Fix RBAC logging function to handle potential PGRST203 errors
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
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into rbac_event_logs (create table if it doesn't exist)
  INSERT INTO public.rbac_event_logs (
    user_id,
    scope,
    object_name,
    action,
    portfolio_id,
    allowed,
    source,
    route,
    user_agent,
    metadata,
    ip_address,
    created_at
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    p_scope,
    p_object,
    p_action,
    p_portfolio_id,
    p_allowed,
    p_source,
    p_route,
    p_user_agent,
    p_metadata,
    COALESCE(
      (current_setting('request.headers', true)::json->>'x-forwarded-for'),
      (current_setting('request.headers', true)::json->>'x-real-ip'),
      '127.0.0.1'
    )::inet,
    now()
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE WARNING 'RBAC logging failed: %', SQLERRM;
    RETURN false;
END;
$$;

-- Create rbac_event_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.rbac_event_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scope text NOT NULL,
  object_name text NOT NULL,
  action text NOT NULL,
  portfolio_id uuid,
  allowed boolean NOT NULL DEFAULT false,
  source text DEFAULT 'client',
  route text,
  user_agent text,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rbac_event_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for RBAC event logs
CREATE POLICY "Account admins can view all RBAC event logs"
ON public.rbac_event_logs FOR SELECT
TO authenticated
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "System can insert RBAC event logs"
ON public.rbac_event_logs FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create function to get RBAC stats
CREATE OR REPLACE FUNCTION public.get_rbac_stats(p_timeframe text DEFAULT '7 days')
RETURNS TABLE(
  total_events bigint,
  denied_events bigint,
  allowed_events bigint,
  unique_users bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE allowed = false) as denied_events,
    COUNT(*) FILTER (WHERE allowed = true) as allowed_events,
    COUNT(DISTINCT user_id) as unique_users
  FROM public.rbac_event_logs
  WHERE created_at >= (now() - p_timeframe::interval);
END;
$$;