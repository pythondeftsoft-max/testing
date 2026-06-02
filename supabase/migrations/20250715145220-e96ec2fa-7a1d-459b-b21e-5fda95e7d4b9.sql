
-- Update the handle_application_approval function to also set property status to occupied
CREATE OR REPLACE FUNCTION handle_application_approval()
RETURNS TRIGGER AS $$
BEGIN
  -- If an application is being approved
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Reject all other pending applications for this tenant
    UPDATE property_applications 
    SET status = 'rejected', 
        updated_at = now()
    WHERE tenant_id = NEW.tenant_id 
    AND id != NEW.id 
    AND status = 'pending';
    
    -- Update property status to occupied when application is approved
    UPDATE properties
    SET status = 'occupied',
        updated_at = now()
    WHERE id = NEW.property_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle tenant request status updates
CREATE OR REPLACE FUNCTION handle_tenant_request_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When a tenant request is created, set property status to available
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE properties
    SET status = 'available',
        updated_at = now()
    WHERE id = NEW.property_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for tenant request status updates
CREATE TRIGGER trigger_handle_tenant_request_status
  AFTER INSERT ON property_tenant_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_tenant_request_status();

-- Update any existing properties with maintenance or pending status to vacant
UPDATE properties 
SET status = 'vacant', updated_at = now() 
WHERE status IN ('maintenance', 'pending');
