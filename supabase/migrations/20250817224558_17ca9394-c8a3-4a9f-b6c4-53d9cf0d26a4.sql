-- Create rbac_audit_logs table for tracking access events
CREATE TABLE public.rbac_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  scope TEXT NOT NULL CHECK (scope IN ('account', 'portfolio')),
  object TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'edit', 'create', 'delete')),
  portfolio_id UUID,
  allowed BOOLEAN NOT NULL DEFAULT false,
  source TEXT DEFAULT 'client',
  route TEXT,
  user_agent TEXT,
  ip_address INET,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rbac_change_logs table for tracking permission changes
CREATE TABLE public.rbac_change_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  changed_by UUID REFERENCES auth.users(id),
  affected_user_id UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('role_added', 'role_removed', 'permission_granted', 'permission_revoked', 'policy_updated')),
  scope TEXT NOT NULL CHECK (scope IN ('account', 'portfolio')),
  portfolio_id UUID,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.rbac_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rbac_change_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for rbac_audit_logs
CREATE POLICY "Admins can view all audit logs"
ON public.rbac_audit_logs
FOR SELECT
TO authenticated
USING (
  has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type])
);

CREATE POLICY "System can insert audit logs"
ON public.rbac_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS policies for rbac_change_logs  
CREATE POLICY "Admins can view all change logs"
ON public.rbac_change_logs
FOR SELECT
TO authenticated
USING (
  has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type])
);

CREATE POLICY "Admins can insert change logs"
ON public.rbac_change_logs
FOR INSERT
TO authenticated
WITH CHECK (
  has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type])
);

-- Create indexes for performance
CREATE INDEX idx_rbac_audit_logs_user_created ON public.rbac_audit_logs(user_id, created_at DESC);
CREATE INDEX idx_rbac_audit_logs_scope_object ON public.rbac_audit_logs(scope, object);
CREATE INDEX idx_rbac_audit_logs_portfolio ON public.rbac_audit_logs(portfolio_id) WHERE portfolio_id IS NOT NULL;
CREATE INDEX idx_rbac_change_logs_changed_by ON public.rbac_change_logs(changed_by, created_at DESC);
CREATE INDEX idx_rbac_change_logs_affected_user ON public.rbac_change_logs(affected_user_id, created_at DESC);

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

-- Create get_rbac_stats RPC function
CREATE OR REPLACE FUNCTION public.get_rbac_stats(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  p_end_date DATE DEFAULT CURRENT_DATE,
  p_scope TEXT DEFAULT NULL,
  p_portfolio_id UUID DEFAULT NULL
)
RETURNS TABLE(
  date DATE,
  total_events BIGINT,
  allowed_events BIGINT,
  denied_events BIGINT,
  unique_users BIGINT,
  top_objects JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH daily_stats AS (
    SELECT 
      DATE(created_at) as log_date,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE allowed = true) as allowed,
      COUNT(*) FILTER (WHERE allowed = false) as denied,
      COUNT(DISTINCT user_id) as users
    FROM public.rbac_audit_logs
    WHERE created_at >= p_start_date
      AND created_at <= p_end_date + INTERVAL '1 day'
      AND (p_scope IS NULL OR scope = p_scope)
      AND (p_portfolio_id IS NULL OR portfolio_id = p_portfolio_id)
    GROUP BY DATE(created_at)
  ),
  object_stats AS (
    SELECT 
      DATE(created_at) as log_date,
      jsonb_agg(
        jsonb_build_object(
          'object', object,
          'count', obj_count
        ) ORDER BY obj_count DESC
      ) FILTER (WHERE row_num <= 5) as top_objs
    FROM (
      SELECT 
        DATE(created_at) as created_at,
        object,
        COUNT(*) as obj_count,
        ROW_NUMBER() OVER (PARTITION BY DATE(created_at) ORDER BY COUNT(*) DESC) as row_num
      FROM public.rbac_audit_logs
      WHERE created_at >= p_start_date
        AND created_at <= p_end_date + INTERVAL '1 day'
        AND (p_scope IS NULL OR scope = p_scope)
        AND (p_portfolio_id IS NULL OR portfolio_id = p_portfolio_id)
      GROUP BY DATE(created_at), object
    ) ranked
    WHERE row_num <= 5
    GROUP BY log_date
  )
  SELECT 
    ds.log_date,
    ds.total,
    ds.allowed,
    ds.denied,
    ds.users,
    COALESCE(os.top_objs, '[]'::jsonb)
  FROM daily_stats ds
  LEFT JOIN object_stats os ON ds.log_date = os.log_date
  ORDER BY ds.log_date;
END;
$$;