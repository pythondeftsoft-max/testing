
-- Create function to handle property status change to vacant
CREATE OR REPLACE FUNCTION handle_property_status_change_to_vacant()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if status changed from 'available' to 'vacant'
  IF OLD.status = 'available' AND NEW.status = 'vacant' THEN
    
    -- Update all pending applications for this property to 'withdrawn'
    -- and return application credits to affected tenants
    UPDATE property_applications 
    SET status = 'withdrawn', 
        updated_at = now()
    WHERE property_id = NEW.id 
      AND status = 'pending';
    
    -- Return application credits to affected tenants
    UPDATE tenant_profiles 
    SET free_applications_remaining = free_applications_remaining + 1,
        updated_at = now()
    WHERE user_id IN (
      SELECT tenant_id 
      FROM property_applications 
      WHERE property_id = NEW.id 
        AND status = 'withdrawn'
        AND updated_at = now()
    );
    
    -- Deactivate any active tenant requests for this property
    UPDATE property_tenant_requests
    SET status = 'inactive',
        updated_at = now()
    WHERE property_id = NEW.id 
      AND status = 'active';
    
    -- Create notifications for affected tenants
    INSERT INTO notifications (user_id, title, description, type, link)
    SELECT 
      pa.tenant_id,
      'Application Credit Returned',
      'Your application credit has been returned because the property at ' || NEW.address || ' is no longer available. This is not a rejection - the property was withdrawn from the market. You can use your returned credit to apply for other properties.',
      'info',
      '/dashboard'
    FROM property_applications pa
    WHERE pa.property_id = NEW.id 
      AND pa.status = 'withdrawn'
      AND pa.updated_at = now();
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for property status changes
CREATE TRIGGER trigger_handle_property_status_change_to_vacant
  AFTER UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION handle_property_status_change_to_vacant();
