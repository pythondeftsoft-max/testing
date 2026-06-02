-- Phase 3: Add missing columns and enhanced functionality

-- Add missing columns to access_grants table
ALTER TABLE public.access_grants 
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS revoked_by UUID NULL,
ADD COLUMN IF NOT EXISTS request_id UUID NULL;

-- Add missing columns to access_requests table  
ALTER TABLE public.access_requests
ADD COLUMN IF NOT EXISTS approved_by UUID NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS denied_by UUID NULL,
ADD COLUMN IF NOT EXISTS denied_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS denial_reason TEXT NULL;

-- Enhance approve_access_request to add notifications
CREATE OR REPLACE FUNCTION public.approve_access_request(
  p_request_id UUID,
  p_duration_hours INTEGER DEFAULT 24
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record RECORD;
  grant_record RECORD;
BEGIN
  -- Check if user has admin permissions
  IF NOT has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]) THEN
    RAISE EXCEPTION 'Insufficient permissions to approve requests';
  END IF;

  -- Get request details
  SELECT * INTO request_record
  FROM public.access_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not in pending status';
  END IF;

  -- Update request status
  UPDATE public.access_requests
  SET 
    status = 'approved',
    approved_by = auth.uid(),
    approved_at = now(),
    updated_at = now()
  WHERE id = p_request_id;

  -- Create access grant
  INSERT INTO public.access_grants (
    user_id, scope, portfolio_id, object_name, action, 
    expires_at, granted_by, request_id
  ) VALUES (
    request_record.requester_id,
    request_record.scope,
    request_record.portfolio_id,
    request_record.object_name,
    request_record.action,
    now() + (p_duration_hours || ' hours')::INTERVAL,
    auth.uid(),
    p_request_id
  ) RETURNING * INTO grant_record;

  -- Send notification to requester
  INSERT INTO public.notifications (
    user_id, title, description, type, link, metadata
  ) VALUES (
    request_record.requester_id,
    'Access Request Approved',
    'Your request for ' || request_record.action || ' access to ' || request_record.object_name || ' has been approved for ' || p_duration_hours || ' hours.',
    'success',
    '/settings/my-access',
    jsonb_build_object(
      'scope', request_record.scope,
      'object', request_record.object_name,
      'action', request_record.action,
      'duration_hours', p_duration_hours,
      'expires_at', grant_record.expires_at,
      'grant_id', grant_record.id
    )
  );

  RETURN TRUE;
END;
$$;

-- Enhance deny_access_request to add notifications
CREATE OR REPLACE FUNCTION public.deny_access_request(
  p_request_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_record RECORD;
BEGIN
  -- Check if user has admin permissions
  IF NOT has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]) THEN
    RAISE EXCEPTION 'Insufficient permissions to deny requests';
  END IF;

  -- Get request details
  SELECT * INTO request_record
  FROM public.access_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not in pending status';
  END IF;

  -- Update request status
  UPDATE public.access_requests
  SET 
    status = 'denied',
    denied_by = auth.uid(),
    denied_at = now(),
    denial_reason = p_reason,
    updated_at = now()
  WHERE id = p_request_id;

  -- Send notification to requester
  INSERT INTO public.notifications (
    user_id, title, description, type, link, metadata
  ) VALUES (
    request_record.requester_id,
    'Access Request Denied',
    'Your request for ' || request_record.action || ' access to ' || request_record.object_name || ' has been denied.' ||
    CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END,
    'error',
    '/settings/my-access',
    jsonb_build_object(
      'scope', request_record.scope,
      'object', request_record.object_name,
      'action', request_record.action,
      'reason', p_reason
    )
  );

  RETURN TRUE;
END;
$$;

-- Enhance revoke_access_grant to add notifications
CREATE OR REPLACE FUNCTION public.revoke_access_grant(
  p_grant_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  grant_record RECORD;
BEGIN
  -- Check if user has admin permissions
  IF NOT has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]) THEN
    RAISE EXCEPTION 'Insufficient permissions to revoke grants';
  END IF;

  -- Get grant details before revoking
  SELECT * INTO grant_record
  FROM public.access_grants
  WHERE id = p_grant_id 
    AND expires_at > now() 
    AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Grant not found or already expired/revoked';
  END IF;

  -- Update grant to mark as revoked
  UPDATE public.access_grants
  SET 
    revoked_at = now(),
    revoked_by = auth.uid(),
    updated_at = now()
  WHERE id = p_grant_id;

  -- Send notification to affected user
  INSERT INTO public.notifications (
    user_id, title, description, type, link, metadata
  ) VALUES (
    grant_record.user_id,
    'Access Grant Revoked',
    'Your ' || grant_record.action || ' access to ' || grant_record.object_name || ' has been revoked by an administrator.' ||
    CASE WHEN p_reason IS NOT NULL THEN ' Reason: ' || p_reason ELSE '' END,
    'warning',
    '/settings/my-access',
    jsonb_build_object(
      'scope', grant_record.scope,
      'object', grant_record.object_name,
      'action', grant_record.action,
      'reason', p_reason,
      'grant_id', grant_record.id
    )
  );

  RETURN TRUE;
END;
$$;

-- Enable realtime for access tables
ALTER TABLE public.access_requests REPLICA IDENTITY FULL;
ALTER TABLE public.access_grants REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.access_grants;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_access_grants_user_lookup 
ON public.access_grants(user_id, scope, portfolio_id, object_name, action);

CREATE INDEX IF NOT EXISTS idx_access_grants_expiry 
ON public.access_grants(expires_at) WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_access_requests_user_status 
ON public.access_requests(requester_id, status, created_at);

-- Schedule cleanup job (runs every 15 minutes)
SELECT cron.schedule(
  'cleanup-expired-access',
  '*/15 * * * *',
  'SELECT cleanup_expired_access();'
);