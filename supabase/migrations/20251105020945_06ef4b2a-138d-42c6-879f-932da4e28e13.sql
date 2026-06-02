-- Phase 1 & 2: Automated Threat Response and Enhanced Alerting System

-- Create security_rules table for automated threat response
CREATE TABLE IF NOT EXISTS public.security_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('failed_login', 'high_risk_session', 'rate_limit', 'suspicious_activity', 'custom')),
  condition_type TEXT NOT NULL CHECK (condition_type IN ('threshold', 'pattern', 'anomaly')),
  threshold_value INTEGER,
  time_window_minutes INTEGER DEFAULT 5,
  action_type TEXT NOT NULL CHECK (action_type IN ('block_ip', 'terminate_session', 'alert', 'throttle', 'escalate')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  enabled BOOLEAN DEFAULT true,
  auto_execute BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create ip_blocklist table
CREATE TABLE IF NOT EXISTS public.ip_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  blocked_at TIMESTAMPTZ DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  blocked_by UUID REFERENCES auth.users(id),
  is_permanent BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create ip_allowlist table
CREATE TABLE IF NOT EXISTS public.ip_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL UNIQUE,
  description TEXT,
  added_at TIMESTAMPTZ DEFAULT now(),
  added_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create alert_configurations table
CREATE TABLE IF NOT EXISTS public.alert_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_name TEXT NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('email', 'sms', 'webhook', 'in_app')),
  event_types TEXT[] NOT NULL,
  severity_levels TEXT[] NOT NULL,
  enabled BOOLEAN DEFAULT true,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  webhook_url TEXT,
  email_template TEXT,
  throttle_minutes INTEGER DEFAULT 5,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create alert_history table
CREATE TABLE IF NOT EXISTS public.alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_config_id UUID REFERENCES public.alert_configurations(id),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  recipient TEXT,
  status TEXT CHECK (status IN ('sent', 'failed', 'pending', 'acknowledged')),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create automated_actions_log table
CREATE TABLE IF NOT EXISTS public.automated_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.security_rules(id),
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  executed_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.security_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_allowlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_actions_log ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access only
CREATE POLICY "Admins can manage security rules"
  ON public.security_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can manage IP blocklist"
  ON public.ip_blocklist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can manage IP allowlist"
  ON public.ip_allowlist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can manage alert configurations"
  ON public.alert_configurations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can view alert history"
  ON public.alert_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can acknowledge alerts"
  ON public.alert_history
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

CREATE POLICY "Admins can view automated actions log"
  ON public.automated_actions_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Create function to check if IP is blocked
CREATE OR REPLACE FUNCTION public.is_ip_blocked(check_ip INET)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.ip_blocklist
    WHERE ip_address = check_ip
    AND (is_permanent = true OR blocked_until > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to execute automated security action
CREATE OR REPLACE FUNCTION public.execute_security_action(
  p_rule_id UUID,
  p_action_type TEXT,
  p_target_type TEXT,
  p_target_id TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_success BOOLEAN := true;
  v_error_message TEXT := NULL;
BEGIN
  -- Execute the action based on type
  BEGIN
    CASE p_action_type
      WHEN 'block_ip' THEN
        INSERT INTO public.ip_blocklist (ip_address, reason, blocked_by, metadata)
        VALUES (p_target_id::INET, 'Automated security rule', auth.uid(), p_metadata);
        
      WHEN 'terminate_session' THEN
        UPDATE public.user_sessions
        SET is_active = false, updated_at = now()
        WHERE id = p_target_id::UUID;
        
      WHEN 'throttle' THEN
        -- Rate limiting handled in edge function
        NULL;
        
      ELSE
        v_error_message := 'Unknown action type: ' || p_action_type;
        v_success := false;
    END CASE;
  EXCEPTION WHEN OTHERS THEN
    v_success := false;
    v_error_message := SQLERRM;
  END;

  -- Log the action
  INSERT INTO public.automated_actions_log (
    rule_id, action_type, target_type, target_id, success, error_message, metadata
  ) VALUES (
    p_rule_id, p_action_type, p_target_type, p_target_id, v_success, v_error_message, p_metadata
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to send alert
CREATE OR REPLACE FUNCTION public.send_security_alert(
  p_event_type TEXT,
  p_severity TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
DECLARE
  v_config RECORD;
BEGIN
  -- Find matching alert configurations
  FOR v_config IN
    SELECT * FROM public.alert_configurations
    WHERE enabled = true
    AND p_event_type = ANY(event_types)
    AND p_severity = ANY(severity_levels)
  LOOP
    -- Insert into alert history
    INSERT INTO public.alert_history (
      alert_config_id, event_type, severity, message, status, metadata
    ) VALUES (
      v_config.id, p_event_type, p_severity, p_message, 'pending', p_metadata
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX idx_security_rules_enabled ON public.security_rules(enabled) WHERE enabled = true;
CREATE INDEX idx_ip_blocklist_address ON public.ip_blocklist(ip_address);
CREATE INDEX idx_ip_allowlist_address ON public.ip_allowlist(ip_address);
CREATE INDEX idx_alert_history_status ON public.alert_history(status) WHERE status = 'pending';
CREATE INDEX idx_alert_history_created ON public.alert_history(created_at DESC);
CREATE INDEX idx_automated_actions_log_created ON public.automated_actions_log(executed_at DESC);

-- Insert default security rules
INSERT INTO public.security_rules (rule_name, rule_type, condition_type, threshold_value, time_window_minutes, action_type, severity, enabled, auto_execute) VALUES
('Block after 5 failed logins', 'failed_login', 'threshold', 5, 15, 'block_ip', 'high', true, true),
('Terminate high-risk sessions', 'high_risk_session', 'threshold', 90, 5, 'terminate_session', 'critical', true, true),
('Alert on suspicious activity', 'suspicious_activity', 'pattern', NULL, 60, 'alert', 'medium', true, true);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_ip_blocked(INET) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_security_action(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_security_alert(TEXT, TEXT, TEXT, JSONB) TO authenticated;