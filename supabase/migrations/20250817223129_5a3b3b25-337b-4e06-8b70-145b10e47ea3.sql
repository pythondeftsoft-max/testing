-- Create RBAC audit logs table
CREATE TABLE public.rbac_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('account', 'portfolio')),
  object TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'edit', 'create', 'delete')),
  portfolio_id UUID,
  allowed BOOLEAN NOT NULL DEFAULT false,
  source TEXT DEFAULT 'client',
  route TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create RBAC change logs table
CREATE TABLE public.rbac_change_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  changed_by UUID NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('role_assigned', 'role_removed', 'permission_granted', 'permission_revoked', 'policy_updated')),
  target_user_id UUID,
  target_scope TEXT CHECK (target_scope IN ('account', 'portfolio')),
  target_portfolio_id UUID,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create RLS policies for rbac_audit_logs
ALTER TABLE public.rbac_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all RBAC audit logs"
ON public.rbac_audit_logs
FOR SELECT
USING (is_admin(auth.uid()) OR has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "System can insert RBAC audit logs"
ON public.rbac_audit_logs
FOR INSERT
WITH CHECK (true);

-- Create RLS policies for rbac_change_logs
ALTER TABLE public.rbac_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all RBAC change logs"
ON public.rbac_change_logs
FOR SELECT
USING (is_admin(auth.uid()) OR has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "Authorized users can insert RBAC change logs"
ON public.rbac_change_logs
FOR INSERT
WITH CHECK (is_admin(auth.uid()) OR has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

-- Create the log_rbac_event RPC function
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
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently to not disrupt user experience
    RETURN FALSE;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_rbac_audit_logs_user_id ON public.rbac_audit_logs(user_id);
CREATE INDEX idx_rbac_audit_logs_created_at ON public.rbac_audit_logs(created_at DESC);
CREATE INDEX idx_rbac_audit_logs_scope_action ON public.rbac_audit_logs(scope, action);
CREATE INDEX idx_rbac_audit_logs_allowed ON public.rbac_audit_logs(allowed);

CREATE INDEX idx_rbac_change_logs_changed_by ON public.rbac_change_logs(changed_by);
CREATE INDEX idx_rbac_change_logs_created_at ON public.rbac_change_logs(created_at DESC);
CREATE INDEX idx_rbac_change_logs_change_type ON public.rbac_change_logs(change_type);