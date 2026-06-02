-- Comprehensive fix: Replace p.full_name with CONCAT(p.first_name, ' ', p.last_name)
-- WITHOUT changing function signatures to avoid dependencies issues

-- 1. Fix get_referrals_recent_activity_admin
CREATE OR REPLACE FUNCTION public.get_referrals_recent_activity_admin(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  referral_id UUID,
  referrer_id UUID,
  referrer_name TEXT,
  referred_name TEXT,
  referred_email TEXT,
  referred_user_id UUID,
  status TEXT,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as referral_id,
    r.referrer_id,
    CONCAT(p.first_name, ' ', p.last_name) as referrer_name,
    r.referred_name,
    r.referred_email,
    r.referred_user_id,
    r.status,
    r.updated_at
  FROM referrals r
  LEFT JOIN profiles p ON r.referrer_id = p.id
  ORDER BY r.updated_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix get_points_leaderboard_admin
CREATE OR REPLACE FUNCTION public.get_points_leaderboard_admin(
  period TEXT DEFAULT '30d',
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  total_points BIGINT
) AS $$
DECLARE
  start_date TIMESTAMPTZ;
BEGIN
  start_date := CASE period
    WHEN '7d' THEN NOW() - INTERVAL '7 days'
    WHEN '30d' THEN NOW() - INTERVAL '30 days'
    WHEN '90d' THEN NOW() - INTERVAL '90 days'
    WHEN 'all' THEN '1970-01-01'::TIMESTAMPTZ
    ELSE NOW() - INTERVAL '30 days'
  END;

  RETURN QUERY
  SELECT 
    ph.user_id,
    COALESCE(CONCAT(p.first_name, ' ', p.last_name), au.email) as user_name,
    SUM(ph.points_change) as total_points
  FROM points_history ph
  LEFT JOIN profiles p ON ph.user_id = p.id
  LEFT JOIN auth.users au ON ph.user_id = au.id
  WHERE ph.timestamp >= start_date
  GROUP BY ph.user_id, p.first_name, p.last_name, au.email
  ORDER BY total_points DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix log_tenant_stage_change (CRITICAL FOR PLACEMENT FEES)
CREATE OR REPLACE FUNCTION public.log_tenant_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
  actor_name TEXT;
  actor_role TEXT;
BEGIN
  -- Get action type based on user's role priority
  SELECT 
    COALESCE(CONCAT(p.first_name, ' ', p.last_name), p.email, 'System') as actor_name,
    CASE 
      -- Check system admins first (highest priority)
      WHEN sa.role_name IS NOT NULL THEN sa.role_name::TEXT
      -- Then check account roles
      WHEN ar.role_name IS NOT NULL THEN ar.role_name::TEXT
      ELSE 'user'
    END as determined_role
  INTO actor_name, actor_role
  FROM profiles p
  LEFT JOIN system_admins sa ON p.id = sa.user_id AND sa.is_active = true
  LEFT JOIN account_roles ar ON p.id = ar.user_id AND ar.is_active = true
  WHERE p.id = auth.uid()
  ORDER BY 
    CASE 
      WHEN sa.role_name IS NOT NULL THEN 1
      WHEN ar.role_name IS NOT NULL THEN 2
      ELSE 3
    END
  LIMIT 1;

  action_type := CASE
    WHEN TG_OP = 'INSERT' THEN 'tenant_stage_created'
    WHEN OLD.current_stage != NEW.current_stage THEN 'tenant_stage_changed'
    WHEN OLD.is_active != NEW.is_active THEN 
      CASE WHEN NEW.is_active THEN 'tenant_stage_activated' ELSE 'tenant_stage_deactivated' END
    ELSE 'tenant_stage_updated'
  END;

  INSERT INTO security_audit_logs (
    user_id,
    action,
    object_type,
    object_id,
    allowed,
    metadata
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
    action_type,
    'tenant_stage',
    NEW.id,
    true,
    jsonb_build_object(
      'tenant_id', NEW.tenant_id,
      'old_stage', COALESCE(OLD.current_stage, 'none'),
      'new_stage', NEW.current_stage,
      'actor_name', actor_name,
      'actor_role', actor_role,
      'is_active', NEW.is_active
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix log_property_stage_change
CREATE OR REPLACE FUNCTION public.log_property_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  action_type TEXT;
  actor_name TEXT;
  actor_role TEXT;
BEGIN
  -- Get action type based on user's role priority
  SELECT 
    COALESCE(CONCAT(p.first_name, ' ', p.last_name), p.email, 'System') as actor_name,
    CASE 
      -- Check system admins first (highest priority)
      WHEN sa.role_name IS NOT NULL THEN sa.role_name::TEXT
      -- Then check account roles
      WHEN ar.role_name IS NOT NULL THEN ar.role_name::TEXT
      ELSE 'user'
    END as determined_role
  INTO actor_name, actor_role
  FROM profiles p
  LEFT JOIN system_admins sa ON p.id = sa.user_id AND sa.is_active = true
  LEFT JOIN account_roles ar ON p.id = ar.user_id AND ar.is_active = true
  WHERE p.id = auth.uid()
  ORDER BY 
    CASE 
      WHEN sa.role_name IS NOT NULL THEN 1
      WHEN ar.role_name IS NOT NULL THEN 2
      ELSE 3
    END
  LIMIT 1;

  action_type := CASE
    WHEN TG_OP = 'INSERT' THEN 'property_stage_created'
    WHEN OLD.current_stage != NEW.current_stage THEN 'property_stage_changed'
    WHEN OLD.is_active != NEW.is_active THEN 
      CASE WHEN NEW.is_active THEN 'property_stage_activated' ELSE 'property_stage_deactivated' END
    ELSE 'property_stage_updated'
  END;

  INSERT INTO security_audit_logs (
    user_id,
    action,
    object_type,
    object_id,
    allowed,
    metadata
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
    action_type,
    'property_stage',
    NEW.id,
    true,
    jsonb_build_object(
      'property_id', NEW.property_id,
      'old_stage', COALESCE(OLD.current_stage, 'none'),
      'new_stage', NEW.current_stage,
      'actor_name', actor_name,
      'actor_role', actor_role,
      'is_active', NEW.is_active
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fix admin_get_property_audit_trail
CREATE OR REPLACE FUNCTION public.admin_get_property_audit_trail(
  p_property_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  log_id UUID,
  user_id UUID,
  action TEXT,
  allowed BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  user_name TEXT,
  user_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sal.id as log_id,
    sal.user_id,
    sal.action,
    sal.allowed,
    sal.metadata,
    sal.created_at,
    COALESCE(CONCAT(p.first_name, ' ', p.last_name), p.email, 'Unknown') as user_name,
    p.email as user_email
  FROM security_audit_logs sal
  LEFT JOIN profiles p ON sal.user_id = p.id
  WHERE sal.object_type = 'property' 
    AND sal.object_id = p_property_id
  ORDER BY sal.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Fix admin_get_property_units_audit_trail
CREATE OR REPLACE FUNCTION public.admin_get_property_units_audit_trail(
  p_property_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  log_id UUID,
  user_id UUID,
  action TEXT,
  allowed BOOLEAN,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  user_name TEXT,
  user_email TEXT,
  unit_id UUID,
  unit_number TEXT,
  unit_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sal.id as log_id,
    sal.user_id,
    sal.action,
    sal.allowed,
    sal.metadata,
    sal.created_at,
    COALESCE(CONCAT(p.first_name, ' ', p.last_name), p.email, 'Unknown') as user_name,
    p.email as user_email,
    pu.id as unit_id,
    pu.unit_number,
    pu.unit_name
  FROM security_audit_logs sal
  LEFT JOIN profiles p ON sal.user_id = p.id
  LEFT JOIN property_units pu ON sal.object_id = pu.id
  WHERE sal.object_type = 'unit' 
    AND pu.property_id = p_property_id
  ORDER BY sal.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;