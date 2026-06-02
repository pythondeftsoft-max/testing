-- Phase 1 & 2: Application Table Consolidation + Schema Updates

-- Add marketplace_application_id to property_applications for linking
ALTER TABLE property_applications 
ADD COLUMN IF NOT EXISTS marketplace_application_id UUID REFERENCES marketplace_applications(id);

-- Add lease tracking fields to property_applications
ALTER TABLE property_applications 
ADD COLUMN IF NOT EXISTS lease_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lease_sent_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS lease_document_id UUID REFERENCES property_documents(id),
ADD COLUMN IF NOT EXISTS lease_method TEXT CHECK (lease_method IN ('uploaded', 'openkey')),
ADD COLUMN IF NOT EXISTS placement_fee_id UUID REFERENCES landlord_placement_fees(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_property_applications_marketplace_id ON property_applications(marketplace_application_id);
CREATE INDEX IF NOT EXISTS idx_property_applications_lease_sent ON property_applications(lease_sent_at) WHERE lease_sent_at IS NOT NULL;

-- Create trigger function to sync marketplace_applications to property_applications
CREATE OR REPLACE FUNCTION sync_marketplace_to_property_applications()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create if one doesn't already exist for this marketplace application
  IF NOT EXISTS (
    SELECT 1 FROM property_applications 
    WHERE marketplace_application_id = NEW.id
  ) THEN
    -- Insert into property_applications
    -- property_id is always set (NOT NULL constraint), unit_id may be set
    INSERT INTO property_applications (
      tenant_id,
      property_id,
      unit_id,
      status,
      marketplace_application_id
    ) VALUES (
      NEW.user_id,
      NEW.property_id,
      NULL,  -- Always set unit_id to NULL to satisfy check constraint
      'submitted',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on marketplace_applications
DROP TRIGGER IF EXISTS sync_marketplace_applications_trigger ON marketplace_applications;
CREATE TRIGGER sync_marketplace_applications_trigger
AFTER INSERT ON marketplace_applications
FOR EACH ROW
EXECUTE FUNCTION sync_marketplace_to_property_applications();

-- Backfill existing marketplace_applications into property_applications
-- Only sync records that don't already exist
INSERT INTO property_applications (
  tenant_id,
  property_id,
  unit_id,
  status,
  marketplace_application_id
)
SELECT 
  ma.user_id,
  ma.property_id,
  NULL,  -- Set to NULL to satisfy check constraint
  'submitted',
  ma.id
FROM marketplace_applications ma
WHERE NOT EXISTS (
  SELECT 1 FROM property_applications pa 
  WHERE pa.marketplace_application_id = ma.id
);

-- Add comment for documentation
COMMENT ON COLUMN property_applications.marketplace_application_id IS 'Links to the original marketplace quick apply record if this application originated from marketplace';
COMMENT ON COLUMN property_applications.lease_method IS 'Method used for lease: uploaded (external) or openkey (internal digital signing)';
COMMENT ON COLUMN property_applications.placement_fee_id IS 'Links to the placement fee record created when lease is sent';