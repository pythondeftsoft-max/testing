-- First, let's handle existing duplicate approved applications
-- Keep only the most recent approved application per tenant
WITH ranked_applications AS (
  SELECT id, 
         tenant_id,
         ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY updated_at DESC) as rn
  FROM property_applications 
  WHERE status = 'approved'
),
applications_to_reject AS (
  SELECT id 
  FROM ranked_applications 
  WHERE rn > 1
)
UPDATE property_applications 
SET status = 'rejected', 
    updated_at = now()
WHERE id IN (SELECT id FROM applications_to_reject);

-- Now create the unique partial index
CREATE UNIQUE INDEX idx_property_applications_tenant_approved 
ON property_applications (tenant_id) 
WHERE status = 'approved';

-- Add RLS policy for maintenance requests to ensure they're tied to approved property
CREATE POLICY "Tenants can only create maintenance requests for their approved property"
ON maintenance_requests
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = auth.uid() AND
  EXISTS (
    SELECT 1 
    FROM property_applications pa 
    WHERE pa.property_id = maintenance_requests.property_id 
    AND pa.tenant_id = auth.uid()
    AND pa.status = 'approved'
  )
);

-- Function to handle application approval (auto-reject other pending applications)
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
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for application approval
CREATE TRIGGER trigger_handle_application_approval
  AFTER UPDATE ON property_applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_application_approval();