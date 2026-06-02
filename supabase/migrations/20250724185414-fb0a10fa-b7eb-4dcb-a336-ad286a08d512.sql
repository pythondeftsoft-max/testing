-- Add database indexes for performance optimization
-- These indexes will significantly improve query performance for frequently accessed columns

-- White label configurations indexes
CREATE INDEX IF NOT EXISTS idx_white_label_configs_user_id ON white_label_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_white_label_configs_custom_domain ON white_label_configs(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_white_label_configs_custom_subdomain ON white_label_configs(custom_subdomain) WHERE custom_subdomain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_white_label_configs_is_active ON white_label_configs(is_active) WHERE is_active = true;

-- White label teams and members indexes
CREATE INDEX IF NOT EXISTS idx_white_label_teams_config_id ON white_label_teams(config_id);
CREATE INDEX IF NOT EXISTS idx_white_label_team_members_team_id ON white_label_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_white_label_team_members_user_id ON white_label_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_white_label_team_members_active ON white_label_team_members(is_active) WHERE is_active = true;

-- Form submissions indexes
CREATE INDEX IF NOT EXISTS idx_white_label_form_submissions_form_id ON white_label_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_white_label_form_submissions_created_at ON white_label_form_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_white_label_form_submissions_processed ON white_label_form_submissions(processed) WHERE processed = false;

-- White label forms indexes
CREATE INDEX IF NOT EXISTS idx_white_label_forms_config_id ON white_label_forms(config_id);
CREATE INDEX IF NOT EXISTS idx_white_label_forms_is_active ON white_label_forms(is_active) WHERE is_active = true;

-- White label themes indexes
CREATE INDEX IF NOT EXISTS idx_white_label_themes_config_id ON white_label_themes(config_id);
CREATE INDEX IF NOT EXISTS idx_white_label_themes_is_active ON white_label_themes(is_active) WHERE is_active = true;

-- Security audit logs indexes
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON security_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_severity ON security_audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON security_audit_logs(event_type);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Portfolio related indexes
CREATE INDEX IF NOT EXISTS idx_portfolio_points_portfolio_id ON portfolio_points(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_points_tenant_id ON portfolio_points(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_points_created_at ON portfolio_points(created_at);

CREATE INDEX IF NOT EXISTS idx_portfolio_points_distribution_portfolio_id ON portfolio_points_distribution(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_points_distribution_user_id ON portfolio_points_distribution(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_points_distribution_active ON portfolio_points_distribution(active) WHERE active = true;

-- Performance monitoring table for production
CREATE TABLE IF NOT EXISTS production_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_type TEXT NOT NULL DEFAULT 'counter',
  tags JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID
);

-- RLS for production metrics
ALTER TABLE production_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage production metrics" ON production_metrics
  FOR ALL USING (
    has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type])
  );

CREATE POLICY "System can insert metrics" ON production_metrics
  FOR INSERT WITH CHECK (true);

-- Index for production metrics
CREATE INDEX IF NOT EXISTS idx_production_metrics_name_created ON production_metrics(metric_name, created_at);
CREATE INDEX IF NOT EXISTS idx_production_metrics_type ON production_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_production_metrics_created_at ON production_metrics(created_at);

-- Function to record production metrics
CREATE OR REPLACE FUNCTION record_production_metric(
  p_metric_name TEXT,
  p_metric_value NUMERIC,
  p_metric_type TEXT DEFAULT 'counter',
  p_tags JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  metric_id UUID;
BEGIN
  INSERT INTO production_metrics (
    metric_name,
    metric_value,
    metric_type,
    tags,
    created_by
  ) VALUES (
    p_metric_name,
    p_metric_value,
    p_metric_type,
    p_tags,
    auth.uid()
  ) RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Performance optimization: Add partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_user ON subscriptions(user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);
CREATE INDEX IF NOT EXISTS idx_properties_owner_status ON properties(owner_id, status) WHERE deleted_at IS NULL;

-- Function to get system health metrics
CREATE OR REPLACE FUNCTION get_system_health_metrics()
RETURNS TABLE(
  metric_name TEXT,
  current_value NUMERIC,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'database_connections'::TEXT,
    (SELECT COUNT(*)::NUMERIC FROM pg_stat_activity WHERE state = 'active'),
    CASE 
      WHEN (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') < 100 THEN 'healthy'
      WHEN (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') < 150 THEN 'warning'
      ELSE 'critical'
    END
  UNION ALL
  SELECT 
    'active_users_24h'::TEXT,
    (SELECT COUNT(DISTINCT user_id)::NUMERIC FROM security_audit_logs WHERE created_at > now() - interval '24 hours'),
    'healthy'::TEXT
  UNION ALL
  SELECT
    'error_rate_1h'::TEXT,
    (SELECT COUNT(*)::NUMERIC FROM security_audit_logs WHERE severity = 'error' AND created_at > now() - interval '1 hour'),
    CASE 
      WHEN (SELECT COUNT(*) FROM security_audit_logs WHERE severity = 'error' AND created_at > now() - interval '1 hour') < 10 THEN 'healthy'
      WHEN (SELECT COUNT(*) FROM security_audit_logs WHERE severity = 'error' AND created_at > now() - interval '1 hour') < 50 THEN 'warning'
      ELSE 'critical'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;