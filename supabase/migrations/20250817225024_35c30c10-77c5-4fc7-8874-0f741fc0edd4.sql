-- Create log_rbac_event RPC function
CREATE OR REPLACE FUNCTION public.log_rbac_event(
  p_scope TEXT,
  p_object TEXT,
  p_action TEXT,
  p_portfolio_id UUID DEFAULT NULL,
  p_allowed BOOLEAN DEFAULT false,
  p_source TEXT DEFAULT 'client',
  p_route TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    p_metadata
  );
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the original operation
    RETURN false;
END;
$$;