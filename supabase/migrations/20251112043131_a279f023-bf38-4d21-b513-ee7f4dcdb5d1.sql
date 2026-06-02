-- Drop existing single-parameter admin_soft_delete_property function
DROP FUNCTION IF EXISTS admin_soft_delete_property(UUID);

-- Create new three-parameter admin_soft_delete_property function
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
    original_id,
    property_data,
    deleted_by,
    deleted_reason
  ) VALUES (
    p_property_id,
    row_to_json(property_record),
    auth.uid(),
    p_reason
  );

  -- Soft delete the property
  UPDATE properties
  SET 
    status = 'deleted',
    deleted_at = now()
  WHERE id = p_property_id;

  -- Log to security audit with reason and metadata
  INSERT INTO security_audit_log (
    user_id,
    action_type,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    auth.uid(),
    'delete',
    'property',
    p_property_id,
    jsonb_build_object(
      'action', 'admin_soft_delete',
      'reason', p_reason,
      'metadata', p_metadata
    )
  );

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete property: %', SQLERRM;
END;
$$;