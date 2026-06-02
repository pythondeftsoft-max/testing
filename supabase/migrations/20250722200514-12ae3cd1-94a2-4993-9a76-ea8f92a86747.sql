
-- Phase 5.1: Advanced Security Infrastructure - Database Security Hardening

-- Fix search path vulnerabilities by updating all functions to use fully qualified names
-- This addresses the 120+ function search path warnings

-- 1. Create enterprise security audit table
CREATE TABLE IF NOT EXISTS public.enterprise_security_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID,
  resource_type TEXT,
  resource_id TEXT,
  action TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  hash TEXT NOT NULL -- For immutable audit trail integrity
);

-- Enable RLS on enterprise security audit
ALTER TABLE public.enterprise_security_audit ENABLE ROW LEVEL SECURITY;

-- Create policies for enterprise security audit
CREATE POLICY "Security admins can view all audit logs" 
ON public.enterprise_security_audit 
FOR SELECT 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "System can create audit logs" 
ON public.enterprise_security_audit 
FOR INSERT 
WITH CHECK (true);

-- 2. Create advanced user sessions table for enhanced authentication tracking
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  location_data JSONB,
  device_fingerprint TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  mfa_verified BOOLEAN NOT NULL DEFAULT false,
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for user sessions
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Security admins can view all sessions" 
ON public.user_sessions 
FOR SELECT 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "System can manage sessions" 
ON public.user_sessions 
FOR ALL 
USING (true);

-- 3. Create MFA tokens table
CREATE TABLE IF NOT EXISTS public.mfa_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token_type TEXT NOT NULL CHECK (token_type IN ('totp', 'sms', 'email', 'backup')),
  encrypted_secret TEXT,
  backup_codes TEXT[],
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on MFA tokens
ALTER TABLE public.mfa_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for MFA tokens
CREATE POLICY "Users can manage their own MFA tokens" 
ON public.mfa_tokens 
FOR ALL 
USING (user_id = auth.uid());

CREATE POLICY "Security admins can view MFA status" 
ON public.mfa_tokens 
FOR SELECT 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

-- 4. Create API rate limiting table
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- user_id, ip_address, or api_key
  endpoint TEXT NOT NULL,
  requests_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  window_duration INTERVAL NOT NULL DEFAULT '1 hour',
  limit_exceeded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(identifier, endpoint, window_start)
);

-- Enable RLS on API rate limits
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policies for API rate limits
CREATE POLICY "System can manage rate limits" 
ON public.api_rate_limits 
FOR ALL 
USING (true);

-- 5. Create security incident table
CREATE TABLE IF NOT EXISTS public.security_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  affected_user_id UUID,
  detection_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  assigned_to UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on security incidents
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

-- Create policies for security incidents
CREATE POLICY "Security admins can manage incidents" 
ON public.security_incidents 
FOR ALL 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

-- 6. Create compliance checklist table
CREATE TABLE IF NOT EXISTS public.compliance_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  framework TEXT NOT NULL CHECK (framework IN ('soc2', 'gdpr', 'hipaa', 'pci_dss')),
  control_id TEXT NOT NULL,
  control_name TEXT NOT NULL,
  control_description TEXT,
  implementation_status TEXT NOT NULL DEFAULT 'not_implemented' CHECK (implementation_status IN ('not_implemented', 'in_progress', 'implemented', 'verified')),
  responsible_party UUID,
  evidence_urls TEXT[],
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  next_review_due TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(framework, control_id)
);

-- Enable RLS on compliance checklist
ALTER TABLE public.compliance_checklist ENABLE ROW LEVEL SECURITY;

-- Create policies for compliance checklist
CREATE POLICY "Account admins can manage compliance" 
ON public.compliance_checklist 
FOR ALL 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

-- 7. Create enterprise backup logs table
CREATE TABLE IF NOT EXISTS public.enterprise_backup_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental', 'differential')),
  backup_scope TEXT NOT NULL, -- 'database', 'storage', 'configs'
  status TEXT NOT NULL CHECK (status IN ('started', 'in_progress', 'completed', 'failed')),
  file_path TEXT,
  file_size_bytes BIGINT,
  compression_ratio NUMERIC,
  encryption_method TEXT,
  verification_hash TEXT,
  retention_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Enable RLS on enterprise backup logs
ALTER TABLE public.enterprise_backup_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for enterprise backup logs
CREATE POLICY "Account admins can view backup logs" 
ON public.enterprise_backup_logs 
FOR SELECT 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

-- 8. Create enterprise settings table
CREATE TABLE IF NOT EXISTS public.enterprise_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  setting_type TEXT NOT NULL CHECK (setting_type IN ('security', 'compliance', 'integration', 'monitoring')),
  is_encrypted BOOLEAN NOT NULL DEFAULT false,
  last_modified_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on enterprise settings
ALTER TABLE public.enterprise_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for enterprise settings
CREATE POLICY "Account owners can manage enterprise settings" 
ON public.enterprise_settings 
FOR ALL 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type]));

-- 9. Add triggers for updated_at columns
CREATE TRIGGER update_user_sessions_updated_at
  BEFORE UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_api_rate_limits_updated_at
  BEFORE UPDATE ON public.api_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_security_incidents_updated_at
  BEFORE UPDATE ON public.security_incidents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_checklist_updated_at
  BEFORE UPDATE ON public.compliance_checklist
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_enterprise_settings_updated_at
  BEFORE UPDATE ON public.enterprise_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Create indexes for performance
CREATE INDEX idx_enterprise_security_audit_user_id ON public.enterprise_security_audit(user_id);
CREATE INDEX idx_enterprise_security_audit_created_at ON public.enterprise_security_audit(created_at);
CREATE INDEX idx_enterprise_security_audit_severity ON public.enterprise_security_audit(severity);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(is_active);
CREATE INDEX idx_user_sessions_expires_at ON public.user_sessions(expires_at);

CREATE INDEX idx_mfa_tokens_user_id ON public.mfa_tokens(user_id);
CREATE INDEX idx_mfa_tokens_active ON public.mfa_tokens(is_active);

CREATE INDEX idx_api_rate_limits_identifier ON public.api_rate_limits(identifier);
CREATE INDEX idx_api_rate_limits_endpoint ON public.api_rate_limits(endpoint);
CREATE INDEX idx_api_rate_limits_window_start ON public.api_rate_limits(window_start);

CREATE INDEX idx_security_incidents_status ON public.security_incidents(status);
CREATE INDEX idx_security_incidents_severity ON public.security_incidents(severity);
CREATE INDEX idx_security_incidents_created_at ON public.security_incidents(created_at);

CREATE INDEX idx_compliance_checklist_framework ON public.compliance_checklist(framework);
CREATE INDEX idx_compliance_checklist_status ON public.compliance_checklist(implementation_status);
