-- Phase 8: RBAC Observability and Admin UX
-- 1) RBAC Audit Logs table for denied/allowed permission attempts
CREATE TABLE public.rbac_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('account', 'portfolio')),
  object TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'edit', 'create', 'delete')),
  portfolio_id UUID,
  allowed BOOLEAN NOT NULL,
  source TEXT DEFAULT 'client',
  route TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rbac_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit logs
CREATE POLICY "Account owners and admins can view audit logs"
ON public.rbac_audit_logs
FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type])
);

CREATE POLICY "Authenticated users can insert audit logs"
ON public.rbac_audit_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger function to set user_id and sanitize data
CREATE OR REPLACE FUNCTION public.rbac_set_current_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Set user_id to current user to prevent spoofing
  NEW.user_id := auth.uid();
  
  -- Truncate user_agent to safe length
  IF NEW.user_agent IS NOT NULL THEN
    NEW.user_agent := LEFT(NEW.user_agent, 500);
  END IF;
  
  -- Truncate route to safe length
  IF NEW.route IS NOT NULL THEN
    NEW.route := LEFT(NEW.route, 255);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger
CREATE TRIGGER rbac_audit_logs_set_user
  BEFORE INSERT ON public.rbac_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.rbac_set_current_user();

-- Indexes for performance
CREATE INDEX idx_rbac_audit_logs_created_at ON public.rbac_audit_logs (created_at DESC);
CREATE INDEX idx_rbac_audit_logs_user_id ON public.rbac_audit_logs (user_id);
CREATE INDEX idx_rbac_audit_logs_portfolio_id ON public.rbac_audit_logs (portfolio_id) WHERE portfolio_id IS NOT NULL;
CREATE INDEX idx_rbac_audit_logs_object_action ON public.rbac_audit_logs (object, action);
CREATE INDEX idx_rbac_audit_logs_allowed_created ON public.rbac_audit_logs (allowed, created_at DESC);

-- 2) RBAC Change Logs table for role/permission changes
CREATE TABLE public.rbac_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL,
  target_user_id UUID,
  change_type TEXT NOT NULL CHECK (change_type IN ('role_insert', 'role_update', 'role_delete', 'permission_update')),
  scope TEXT NOT NULL CHECK (scope IN ('account', 'portfolio')),
  object TEXT,
  portfolio_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rbac_change_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for change logs
CREATE POLICY "Account owners and admins can view change logs"
ON public.rbac_change_logs
FOR SELECT
USING (
  is_admin(auth.uid()) OR 
  has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type])
);

-- Indexes for change logs
CREATE INDEX idx_rbac_change_logs_created_at ON public.rbac_change_logs (created_at DESC);
CREATE INDEX idx_rbac_change_logs_actor_user_id ON public.rbac_change_logs (actor_user_id);
CREATE INDEX idx_rbac_change_logs_portfolio_id ON public.rbac_change_logs (portfolio_id) WHERE portfolio_id IS NOT NULL;
CREATE INDEX idx_rbac_change_logs_change_type ON public.rbac_change_logs (change_type);

-- 3) Trigger functions for change logging
CREATE OR REPLACE FUNCTION public.log_account_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.rbac_change_logs (
      actor_user_id, target_user_id, change_type, scope, object,
      new_value
    ) VALUES (
      COALESCE(auth.uid(), NEW.added_by), NEW.user_id, 'role_insert', 'account', 'account_roles',
      jsonb_build_object(
        'role_name', NEW.role_name,
        'is_active', NEW.is_active,
        'notes', NEW.notes
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.rbac_change_logs (
      actor_user_id, target_user_id, change_type, scope, object,
      old_value, new_value
    ) VALUES (
      auth.uid(), OLD.user_id, 'role_update', 'account', 'account_roles',
      jsonb_build_object(
        'role_name', OLD.role_name,
        'is_active', OLD.is_active,
        'notes', OLD.notes
      ),
      jsonb_build_object(
        'role_name', NEW.role_name,
        'is_active', NEW.is_active,
        'notes', NEW.notes
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.rbac_change_logs (
      actor_user_id, target_user_id, change_type, scope, object,
      old_value
    ) VALUES (
      auth.uid(), OLD.user_id, 'role_delete', 'account', 'account_roles',
      jsonb_build_object(
        'role_name', OLD.role_name,
        'is_active', OLD.is_active,
        'notes', OLD.notes
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_portfolio_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.rbac_change_logs (
      actor_user_id, target_user_id, change_type, scope, object, portfolio_id,
      new_value
    ) VALUES (
      COALESCE(auth.uid(), NEW.added_by), NEW.user_id, 'role_insert', 'portfolio', 'portfolio_roles', NEW.portfolio_id,
      jsonb_build_object(
        'role_name', NEW.role_name,
        'is_active', NEW.is_active,
        'permissions_level', NEW.permissions_level
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.rbac_change_logs (
      actor_user_id, target_user_id, change_type, scope, object, portfolio_id,
      old_value, new_value
    ) VALUES (
      auth.uid(), OLD.user_id, 'role_update', 'portfolio', 'portfolio_roles', OLD.portfolio_id,
      jsonb_build_object(
        'role_name', OLD.role_name,
        'is_active', OLD.is_active,
        'permissions_level', OLD.permissions_level
      ),
      jsonb_build_object(
        'role_name', NEW.role_name,
        'is_active', NEW.is_active,
        'permissions_level', NEW.permissions_level
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.rbac_change_logs (
      actor_user_id, target_user_id, change_type, scope, object, portfolio_id,
      old_value
    ) VALUES (
      auth.uid(), OLD.user_id, 'role_delete', 'portfolio', 'portfolio_roles', OLD.portfolio_id,
      jsonb_build_object(
        'role_name', OLD.role_name,
        'is_active', OLD.is_active,
        'permissions_level', OLD.permissions_level
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Apply triggers to role tables
CREATE TRIGGER account_roles_change_log
  AFTER INSERT OR UPDATE OR DELETE ON public.account_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_account_role_changes();

CREATE TRIGGER portfolio_roles_change_log
  AFTER INSERT OR UPDATE OR DELETE ON public.portfolio_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_portfolio_role_changes();

-- 4) RPC function for client-side logging
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
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Validate inputs
  IF p_scope NOT IN ('account', 'portfolio') THEN
    RAISE EXCEPTION 'Invalid scope: %', p_scope;
  END IF;
  
  IF p_action NOT IN ('view', 'edit', 'create', 'delete') THEN
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;
  
  -- Insert audit log (trigger will set user_id)
  INSERT INTO public.rbac_audit_logs (
    scope, object, action, portfolio_id, allowed, source, route, user_agent, metadata
  ) VALUES (
    p_scope, p_object, p_action, p_portfolio_id, p_allowed, p_source, p_route, p_user_agent, p_metadata
  );
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Fail silently to not break the application
    RETURN FALSE;
END;
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.log_rbac_event FROM PUBLIC;
REVOKE ALL ON FUNCTION public.log_rbac_event FROM anon;
GRANT EXECUTE ON FUNCTION public.log_rbac_event TO authenticated;