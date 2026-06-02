-- Create rbac_access_logs table for telemetry (only missing table)
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
ALTER TABLE public.rbac_access_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rbac_access_logs
CREATE POLICY "Admins can view access logs"
  ON public.rbac_access_logs FOR SELECT
  USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "System can insert access logs"
  ON public.rbac_access_logs FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_rbac_access_logs_user_id ON public.rbac_access_logs(user_id);
CREATE INDEX idx_rbac_access_logs_created_at ON public.rbac_access_logs(created_at);
CREATE INDEX idx_rbac_access_logs_scope_portfolio ON public.rbac_access_logs(scope, portfolio_id);

-- Create missing functions
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