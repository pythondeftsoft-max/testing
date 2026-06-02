-- Add unit_id column to security_audit_logs if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'security_audit_logs' 
    AND column_name = 'unit_id'
  ) THEN
    ALTER TABLE security_audit_logs 
    ADD COLUMN unit_id UUID REFERENCES property_units(id) ON DELETE CASCADE;
    
    CREATE INDEX IF NOT EXISTS idx_security_audit_logs_unit_id 
    ON security_audit_logs(unit_id);
  END IF;
END $$;

-- Function to get audit trail for a specific unit
CREATE OR REPLACE FUNCTION admin_get_unit_audit_trail(
  p_unit_id UUID,
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
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sal.id as log_id,
    sal.user_id,
    sal.action::TEXT,
    sal.allowed,
    sal.metadata,
    sal.created_at,
    COALESCE(p.full_name, p.email, 'Unknown') as user_name,
    p.email as user_email
  FROM security_audit_logs sal
  LEFT JOIN profiles p ON p.id = sal.user_id
  WHERE sal.unit_id = p_unit_id
  ORDER BY sal.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to get combined audit trail for all units in a property
CREATE OR REPLACE FUNCTION admin_get_property_units_audit_trail(
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
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sal.id as log_id,
    sal.user_id,
    sal.action::TEXT,
    sal.allowed,
    sal.metadata,
    sal.created_at,
    COALESCE(p.full_name, p.email, 'Unknown') as user_name,
    p.email as user_email,
    pu.id as unit_id,
    pu.unit_number,
    pu.unit_name
  FROM security_audit_logs sal
  INNER JOIN property_units pu ON pu.id = sal.unit_id
  LEFT JOIN profiles p ON p.id = sal.user_id
  WHERE pu.property_id = p_property_id
  ORDER BY sal.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION admin_get_unit_audit_trail TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_property_units_audit_trail TO authenticated;