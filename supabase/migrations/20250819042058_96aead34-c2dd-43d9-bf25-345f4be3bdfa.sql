-- Create enum for access request status
CREATE TYPE public.access_request_status AS ENUM ('pending', 'approved', 'denied', 'cancelled', 'expired');

-- Create access_requests table
CREATE TABLE public.access_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id UUID NOT NULL,
    scope TEXT NOT NULL CHECK (scope IN ('account', 'portfolio')),
    portfolio_id UUID DEFAULT NULL,
    object_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('view', 'edit', 'delete', 'create')),
    justification TEXT,
    requested_duration_minutes INTEGER NOT NULL DEFAULT 60,
    status access_request_status NOT NULL DEFAULT 'pending',
    decided_by UUID DEFAULT NULL,
    decided_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    decision_reason TEXT DEFAULT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create access_grants table  
CREATE TABLE public.access_grants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    scope TEXT NOT NULL CHECK (scope IN ('account', 'portfolio')),
    portfolio_id UUID DEFAULT NULL,
    object_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('view', 'edit', 'delete', 'create')),
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;

-- Create trigger to auto-deactivate expired grants
CREATE OR REPLACE FUNCTION public.deactivate_expired_grants()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if grant is expired and mark as inactive
  IF NEW.expires_at <= now() THEN
    NEW.is_active = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_grant_expiry
BEFORE INSERT OR UPDATE ON public.access_grants
FOR EACH ROW
EXECUTE FUNCTION public.deactivate_expired_grants();

-- Create unique constraint to prevent overlapping active grants
ALTER TABLE public.access_grants 
ADD CONSTRAINT unique_active_grants_no_portfolio 
EXCLUDE (user_id WITH =, scope WITH =, object_name WITH =, action WITH =) 
WHERE (is_active = true AND portfolio_id IS NULL);

ALTER TABLE public.access_grants 
ADD CONSTRAINT unique_active_grants_with_portfolio 
EXCLUDE (user_id WITH =, scope WITH =, portfolio_id WITH =, object_name WITH =, action WITH =) 
WHERE (is_active = true AND portfolio_id IS NOT NULL);

-- RLS Policies for access_requests
CREATE POLICY "Users can insert their own access requests" 
ON public.access_requests 
FOR INSERT 
WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Users can view their own access requests" 
ON public.access_requests 
FOR SELECT 
USING (requester_id = auth.uid());

CREATE POLICY "Account admins can view all access requests" 
ON public.access_requests 
FOR SELECT 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "Portfolio admins can view portfolio access requests" 
ON public.access_requests 
FOR SELECT 
USING (scope = 'portfolio' AND portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type]));

CREATE POLICY "Account admins can update access requests" 
ON public.access_requests 
FOR UPDATE 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "Portfolio admins can update portfolio access requests" 
ON public.access_requests 
FOR UPDATE 
USING (scope = 'portfolio' AND portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type]));

CREATE POLICY "Users can cancel their own pending requests" 
ON public.access_requests 
FOR UPDATE 
USING (requester_id = auth.uid() AND status = 'pending');

-- RLS Policies for access_grants
CREATE POLICY "Users can view their own access grants" 
ON public.access_grants 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Account admins can view all access grants" 
ON public.access_grants 
FOR SELECT 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "Portfolio admins can view portfolio access grants" 
ON public.access_grants 
FOR SELECT 
USING (scope = 'portfolio' AND portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type]));

CREATE POLICY "Grant creators can view grants they created" 
ON public.access_grants 
FOR SELECT 
USING (created_by = auth.uid());

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_access_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Set decided_at when status changes from pending
  IF OLD.status = 'pending' AND NEW.status != 'pending' AND NEW.decided_at IS NULL THEN
    NEW.decided_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_access_requests_updated_at
BEFORE UPDATE ON public.access_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_access_requests_updated_at();

CREATE OR REPLACE FUNCTION public.update_access_grants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_access_grants_updated_at
BEFORE UPDATE ON public.access_grants
FOR EACH ROW
EXECUTE FUNCTION public.update_access_grants_updated_at();

-- RPC Functions
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
  -- Get the request
  SELECT * INTO request_record 
  FROM public.access_requests 
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not pending';
  END IF;
  
  -- Check authority
  IF request_record.scope = 'account' THEN
    IF NOT has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]) THEN
      RAISE EXCEPTION 'Insufficient permissions to approve account-level requests';
    END IF;
  ELSIF request_record.scope = 'portfolio' THEN
    IF NOT has_portfolio_role(request_record.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type]) THEN
      RAISE EXCEPTION 'Insufficient permissions to approve portfolio-level requests';
    END IF;
  END IF;
  
  -- Determine duration
  grant_duration := COALESCE(p_minutes, request_record.requested_duration_minutes);
  
  -- Update request
  UPDATE public.access_requests 
  SET status = 'approved',
      decided_by = auth.uid(),
      decided_at = now(),
      decision_reason = p_reason,
      expires_at = now() + (grant_duration || ' minutes')::INTERVAL
  WHERE id = p_request_id;
  
  -- Deactivate any existing grants first
  UPDATE public.access_grants 
  SET is_active = false
  WHERE user_id = request_record.requester_id
    AND scope = request_record.scope
    AND COALESCE(portfolio_id, '00000000-0000-0000-0000-000000000000'::UUID) = 
        COALESCE(request_record.portfolio_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND object_name = request_record.object_name
    AND action = request_record.action
    AND is_active = true;
  
  -- Create grant
  INSERT INTO public.access_grants (
    user_id, scope, portfolio_id, object_name, action, 
    created_by, expires_at, is_active
  ) VALUES (
    request_record.requester_id,
    request_record.scope,
    request_record.portfolio_id,
    request_record.object_name,
    request_record.action,
    auth.uid(),
    now() + (grant_duration || ' minutes')::INTERVAL,
    true
  );
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.deny_access_request(
  p_request_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- Get the request
  SELECT * INTO request_record 
  FROM public.access_requests 
  WHERE id = p_request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not pending';
  END IF;
  
  -- Check authority
  IF request_record.scope = 'account' THEN
    IF NOT has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]) THEN
      RAISE EXCEPTION 'Insufficient permissions to deny account-level requests';
    END IF;
  ELSIF request_record.scope = 'portfolio' THEN
    IF NOT has_portfolio_role(request_record.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type]) THEN
      RAISE EXCEPTION 'Insufficient permissions to deny portfolio-level requests';
    END IF;
  END IF;
  
  -- Update request
  UPDATE public.access_requests 
  SET status = 'denied',
      decided_by = auth.uid(),
      decided_at = now(),
      decision_reason = p_reason
  WHERE id = p_request_id;
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_access_request(p_request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.access_requests 
  SET status = 'cancelled'
  WHERE id = p_request_id 
    AND requester_id = auth.uid() 
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found, not yours, or not pending';
  END IF;
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_active_grants(
  p_user_id UUID DEFAULT NULL,
  p_portfolio_id UUID DEFAULT NULL
)
RETURNS TABLE(
  scope TEXT,
  portfolio_id UUID,
  object_name TEXT,
  action TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    ag.scope,
    ag.portfolio_id,
    ag.object_name,
    ag.action,
    ag.expires_at
  FROM public.access_grants ag
  WHERE ag.user_id = COALESCE(p_user_id, auth.uid())
    AND ag.is_active = true
    AND ag.expires_at > now()
    AND (p_portfolio_id IS NULL OR ag.portfolio_id = p_portfolio_id OR ag.scope = 'account');
$$;

CREATE OR REPLACE FUNCTION public.purge_expired_access_grants(p_days INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Only admins can purge
  IF NOT has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]) THEN
    RAISE EXCEPTION 'Insufficient permissions to purge grants';
  END IF;
  
  DELETE FROM public.access_grants 
  WHERE expires_at < (now() - (p_days || ' days')::INTERVAL);
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;