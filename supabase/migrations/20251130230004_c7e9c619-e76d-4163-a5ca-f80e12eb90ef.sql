-- Fix auto_unpause_property_below_limit trigger to check for primary applicant
CREATE OR REPLACE FUNCTION public.auto_unpause_property_below_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count active applications for this unit
  SELECT COUNT(*)
  INTO v_count
  FROM property_applications
  WHERE unit_id = NEW.unit_id
    AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

  -- Only unpause if below limit AND no primary applicant exists
  IF v_count < 6 THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM property_applications 
      WHERE unit_id = NEW.unit_id 
        AND is_primary_applicant = TRUE 
        AND status NOT IN ('withdrawn', 'rejected', 'cancelled')
    ) THEN
      UPDATE property_units 
      SET on_market = TRUE 
      WHERE id = NEW.unit_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix auto_unpause_listing_below_limit trigger to check for primary applicant
CREATE OR REPLACE FUNCTION public.auto_unpause_listing_below_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Count active applications for this listing
  SELECT COUNT(*)
  INTO v_count
  FROM marketplace_applications
  WHERE listing_id = NEW.listing_id
    AND status NOT IN ('withdrawn', 'rejected', 'cancelled');

  -- Only unpause if below limit AND no primary applicant exists
  IF v_count < 6 THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM marketplace_applications 
      WHERE listing_id = NEW.listing_id 
        AND is_primary_applicant = TRUE 
        AND status NOT IN ('withdrawn', 'rejected', 'cancelled')
    ) THEN
      UPDATE marketplace_listings 
      SET on_market = TRUE 
      WHERE id = NEW.listing_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix log_security_audit_event function - change security_audit_log to security_audit_logs
CREATE OR REPLACE FUNCTION public.log_security_audit_event(
  p_event_type TEXT,
  p_user_id UUID DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_severity TEXT DEFAULT 'info'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO security_audit_logs (
    event_type,
    user_id,
    resource_type,
    resource_id,
    action,
    ip_address,
    user_agent,
    metadata,
    severity
  ) VALUES (
    p_event_type,
    p_user_id,
    p_resource_type,
    p_resource_id,
    p_action,
    p_ip_address,
    p_user_agent,
    p_metadata,
    p_severity
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to log security audit event: %', SQLERRM;
    RETURN NULL;
END;
$$;