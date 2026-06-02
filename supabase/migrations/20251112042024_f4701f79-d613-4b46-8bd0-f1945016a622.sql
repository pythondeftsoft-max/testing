-- Fix admin RLS policy on properties table to allow UPDATE operations
DROP POLICY IF EXISTS "Admins can view all properties" ON properties;

-- Create comprehensive admin policy with both USING and WITH CHECK clauses
CREATE POLICY "Admins can manage all properties" 
  ON properties 
  FOR ALL 
  TO public
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Ensure admin_soft_delete_property function has proper error handling
CREATE OR REPLACE FUNCTION admin_soft_delete_property(property_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  WHERE id = property_id_param;

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
    property_id_param,
    row_to_json(property_record),
    auth.uid(),
    'Admin soft delete from client services'
  );

  -- Soft delete the property
  UPDATE properties
  SET 
    status = 'deleted',
    deleted_at = now()
  WHERE id = property_id_param;

  -- Log to security audit
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
    property_id_param,
    jsonb_build_object('action', 'admin_soft_delete')
  );

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to delete property: %', SQLERRM;
END;
$$;