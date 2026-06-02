-- Drop and recreate admin_soft_delete_property with positional parameter call to log_security_audit
DROP FUNCTION IF EXISTS admin_soft_delete_property(UUID, TEXT, JSONB);

CREATE OR REPLACE FUNCTION admin_soft_delete_property(
  p_property_id UUID,
  p_reason TEXT DEFAULT 'Admin soft delete from client services',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  property_record RECORD;
BEGIN
  -- Check if user is admin
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can delete properties';
  END IF;

  -- Get property data for backup
  SELECT * INTO property_record
  FROM properties
  WHERE id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  -- Insert into deleted_properties for backup
  INSERT INTO deleted_properties (
    original_property_id,
    property_data,
    related_data,
    deleted_by
  ) VALUES (
    p_property_id,
    row_to_json(property_record),
    jsonb_build_object(
      'deletion_reason', p_reason,
      'deletion_metadata', p_metadata
    ),
    auth.uid()
  );

  -- Soft delete the property
  UPDATE properties
  SET 
    status = 'deleted',
    deleted_at = now()
  WHERE id = p_property_id;

  -- Log to security audit using positional parameters (not named) to avoid function overload ambiguity
  PERFORM log_security_audit(
    'property_deletion',           -- p_event_type
    auth.uid(),                     -- p_user_id
    'property',                     -- p_resource_type
    p_property_id::text,            -- p_resource_id
    'admin_soft_delete',            -- p_action
    NULL,                           -- p_ip_address
    NULL,                           -- p_user_agent
    jsonb_build_object(
      'reason', p_reason,
      'metadata', p_metadata
    ),                              -- p_metadata
    'medium'                        -- p_severity
  );

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete property: %', SQLERRM;
END;
$$;