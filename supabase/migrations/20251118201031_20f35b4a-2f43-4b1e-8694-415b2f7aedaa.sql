-- Create function to bulk soft-delete properties (admin only)
CREATE OR REPLACE FUNCTION admin_bulk_soft_delete_properties(property_ids UUID[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_count INTEGER;
  user_role TEXT;
BEGIN
  -- Check if user is admin
  SELECT user_type INTO user_role
  FROM profiles
  WHERE id = auth.uid();
  
  IF user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can bulk delete properties';
  END IF;

  -- Soft delete the properties
  UPDATE properties
  SET 
    deleted_at = now(),
    deleted_by = auth.uid()
  WHERE 
    id = ANY(property_ids)
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  
  RETURN affected_count;
END;
$$;