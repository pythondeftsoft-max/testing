-- Create access_requests table
CREATE TABLE public.access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('account', 'portfolio')),
  portfolio_id UUID NULL,
  object_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'edit', 'delete', 'create')),
  justification TEXT NULL,
  requested_duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'cancelled', 'expired')),
  decided_by UUID NULL,
  decided_at TIMESTAMP WITH TIME ZONE NULL,
  decision_reason TEXT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create access_grants table (for active temporary grants)
CREATE TABLE public.access_grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('account', 'portfolio')),
  portfolio_id UUID NULL,
  object_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'edit', 'delete', 'create')),
  granted_by UUID NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE NULL,
  revoked_by UUID NULL,
  access_request_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rbac_access_logs table for telemetry
CREATE TABLE public.rbac_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('account', 'portfolio')),
  portfolio_id UUID NULL,
  object TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'edit', 'delete', 'create')),
  allowed BOOLEAN NOT NULL DEFAULT false,
  source TEXT NULL DEFAULT 'client',
  route TEXT NULL,
  user_agent TEXT NULL,
  metadata JSONB NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for access_requests
CREATE POLICY "Users can view their own requests"
  ON public.access_requests FOR SELECT
  USING (requester_id = auth.uid());

CREATE POLICY "Users can create their own requests"
  ON public.access_requests FOR INSERT
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can cancel their own requests"
  ON public.access_requests FOR UPDATE
  USING (requester_id = auth.uid() AND status = 'pending');

CREATE POLICY "Admins can manage all requests"
  ON public.access_requests FOR ALL
  USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

-- RLS Policies for access_grants
CREATE POLICY "Users can view their own grants"
  ON public.access_grants FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all grants"
  ON public.access_grants FOR ALL
  USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

-- RLS Policies for rbac_access_logs
CREATE POLICY "Admins can view access logs"
  ON public.rbac_access_logs FOR SELECT
  USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "System can insert access logs"
  ON public.rbac_access_logs FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_access_requests_requester_id ON public.access_requests(requester_id);
CREATE INDEX idx_access_requests_status ON public.access_requests(status);
CREATE INDEX idx_access_requests_scope_portfolio ON public.access_requests(scope, portfolio_id);

CREATE INDEX idx_access_grants_user_id ON public.access_grants(user_id);
CREATE INDEX idx_access_grants_expires_at ON public.access_grants(expires_at);
CREATE INDEX idx_access_grants_scope_portfolio ON public.access_grants(scope, portfolio_id);
CREATE INDEX idx_access_grants_active ON public.access_grants(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE INDEX idx_rbac_access_logs_user_id ON public.rbac_access_logs(user_id);
CREATE INDEX idx_rbac_access_logs_created_at ON public.rbac_access_logs(created_at);
CREATE INDEX idx_rbac_access_logs_scope_portfolio ON public.rbac_access_logs(scope, portfolio_id);

-- Create function to get user active grants
CREATE OR REPLACE FUNCTION public.get_user_active_grants(
  p_user_id UUID,
  p_portfolio_id UUID DEFAULT NULL
)
RETURNS TABLE(
  scope TEXT,
  portfolio_id UUID,
  object_name TEXT,
  action TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ag.scope,
    ag.portfolio_id,
    ag.object_name,
    ag.action,
    ag.expires_at
  FROM public.access_grants ag
  WHERE ag.user_id = p_user_id
    AND ag.expires_at > now()
    AND ag.revoked_at IS NULL
    AND (p_portfolio_id IS NULL OR ag.portfolio_id = p_portfolio_id)
  ORDER BY ag.expires_at ASC;
END;
$$;

-- Create function to approve access request
CREATE OR REPLACE FUNCTION public.approve_access_request(
  p_request_id UUID,
  p_minutes INTEGER DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record RECORD;
  grant_duration INTEGER;
BEGIN
  -- Check if user has admin permissions
  IF NOT has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]) THEN
    RAISE EXCEPTION 'Insufficient permissions to approve requests';
  END IF;

  -- Get the request details
  SELECT * INTO request_record
  FROM public.access_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Determine grant duration (use provided minutes or requested duration)
  grant_duration := COALESCE(p_minutes, request_record.requested_duration_minutes);

  -- Update request status
  UPDATE public.access_requests
  SET 
    status = 'approved',
    decided_by = auth.uid(),
    decided_at = now(),
    decision_reason = p_reason,
    expires_at = now() + (grant_duration || ' minutes')::INTERVAL,
    updated_at = now()
  WHERE id = p_request_id;

  -- Create the grant
  INSERT INTO public.access_grants (
    user_id,
    scope,
    portfolio_id,
    object_name,
    action,
    granted_by,
    expires_at,
    access_request_id
  ) VALUES (
    request_record.requester_id,
    request_record.scope,
    request_record.portfolio_id,
    request_record.object_name,
    request_record.action,
    auth.uid(),
    now() + (grant_duration || ' minutes')::INTERVAL,
    p_request_id
  );

  RETURN TRUE;
END;
$$;

-- Create function to deny access request
CREATE OR REPLACE FUNCTION public.deny_access_request(
  p_request_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has admin permissions
  IF NOT has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]) THEN
    RAISE EXCEPTION 'Insufficient permissions to deny requests';
  END IF;

  -- Update request status
  UPDATE public.access_requests
  SET 
    status = 'denied',
    decided_by = auth.uid(),
    decided_at = now(),
    decision_reason = p_reason,
    updated_at = now()
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  RETURN TRUE;
END;
$$;

-- Create function to cancel access request
CREATE OR REPLACE FUNCTION public.cancel_access_request(
  p_request_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- Get the request details to check ownership
  SELECT * INTO request_record
  FROM public.access_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or already processed';
  END IF;

  -- Check if user can cancel (requester or admin)
  IF request_record.requester_id != auth.uid() AND 
     NOT has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]) THEN
    RAISE EXCEPTION 'Insufficient permissions to cancel this request';
  END IF;

  -- Update request status
  UPDATE public.access_requests
  SET 
    status = 'cancelled',
    updated_at = now()
  WHERE id = p_request_id;

  RETURN TRUE;
END;
$$;

-- Create function to log RBAC events
CREATE OR REPLACE FUNCTION public.log_rbac_event(
  p_scope TEXT,
  p_object TEXT,
  p_action TEXT,
  p_portfolio_id UUID DEFAULT NULL,
  p_allowed BOOLEAN DEFAULT FALSE,
  p_source TEXT DEFAULT 'client',
  p_route TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert the log entry
  INSERT INTO public.rbac_access_logs (
    user_id,
    scope,
    portfolio_id,
    object,
    action,
    allowed,
    source,
    route,
    user_agent,
    metadata
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID),
    p_scope,
    p_portfolio_id,
    p_object,
    p_action,
    p_allowed,
    p_source,
    p_route,
    p_user_agent,
    p_metadata
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently to not disrupt user experience
    RETURN FALSE;
END;
$$;

-- Create function to revoke grants
CREATE OR REPLACE FUNCTION public.revoke_access_grant(
  p_grant_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has admin permissions
  IF NOT has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]) THEN
    RAISE EXCEPTION 'Insufficient permissions to revoke grants';
  END IF;

  -- Update grant to mark as revoked
  UPDATE public.access_grants
  SET 
    revoked_at = now(),
    revoked_by = auth.uid(),
    updated_at = now()
  WHERE id = p_grant_id 
    AND expires_at > now() 
    AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Grant not found or already expired/revoked';
  END IF;

  RETURN TRUE;
END;
$$;

-- Create function to clean up expired grants and requests
CREATE OR REPLACE FUNCTION public.cleanup_expired_access()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Mark expired requests
  UPDATE public.access_requests
  SET status = 'expired', updated_at = now()
  WHERE status = 'approved' 
    AND expires_at < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  RETURN expired_count;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_access_requests_updated_at
  BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_access_grants_updated_at
  BEFORE UPDATE ON public.access_grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();