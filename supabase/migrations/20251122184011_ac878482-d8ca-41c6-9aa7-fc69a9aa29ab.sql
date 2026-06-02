-- Add listing history tracking columns to property_tenant_requests
ALTER TABLE property_tenant_requests
ADD COLUMN IF NOT EXISTS listing_event_type TEXT DEFAULT 'initial_listing' CHECK (listing_event_type IN ('initial_listing', 're_listing')),
ADD COLUMN IF NOT EXISTS previous_listing_id UUID REFERENCES property_tenant_requests(id),
ADD COLUMN IF NOT EXISTS delisted_reason TEXT,
ADD COLUMN IF NOT EXISTS delisted_at TIMESTAMP WITH TIME ZONE;

-- Add contract tracking columns to property_listing_contracts
ALTER TABLE property_listing_contracts
ADD COLUMN IF NOT EXISTS listing_request_id UUID REFERENCES property_tenant_requests(id),
ADD COLUMN IF NOT EXISTS contract_status TEXT DEFAULT 'active' CHECK (contract_status IN ('active', 'inactive'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_property_tenant_requests_listing_event ON property_tenant_requests(listing_event_type);
CREATE INDEX IF NOT EXISTS idx_property_tenant_requests_previous_listing ON property_tenant_requests(previous_listing_id);
CREATE INDEX IF NOT EXISTS idx_property_listing_contracts_listing_request ON property_listing_contracts(listing_request_id);
CREATE INDEX IF NOT EXISTS idx_property_listing_contracts_status ON property_listing_contracts(contract_status);

-- Update RLS policies for admin-only contract access
DROP POLICY IF EXISTS "Users can view their own contracts" ON property_listing_contracts;
DROP POLICY IF EXISTS "property_listing_contracts_select" ON property_listing_contracts;

-- Admin-only read access to contracts
CREATE POLICY "admin_view_all_contracts" ON property_listing_contracts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Admin-only insert access to contracts
CREATE POLICY "admin_insert_contracts" ON property_listing_contracts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Update deactivate_property function to mark listings inactive instead of deleting
CREATE OR REPLACE FUNCTION deactivate_property(target_property_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update the active listing request to inactive
  UPDATE property_tenant_requests
  SET 
    status = 'inactive',
    delisted_at = NOW(),
    updated_at = NOW()
  WHERE property_id = target_property_id
    AND unit_id IS NULL
    AND status = 'active';

  -- Mark associated contracts as inactive
  UPDATE property_listing_contracts
  SET contract_status = 'inactive'
  WHERE property_id = target_property_id
    AND unit_id IS NULL
    AND contract_status = 'active';

  -- Update property status
  UPDATE properties
  SET 
    status = 'deactivated',
    on_market = false,
    deactivated_at = NOW()
  WHERE id = target_property_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create reactivate_property function that creates NEW listing records
CREATE OR REPLACE FUNCTION reactivate_property(target_property_id UUID)
RETURNS UUID AS $$
DECLARE
  previous_listing_id_var UUID;
  new_listing_id UUID;
BEGIN
  -- Find the most recent listing (if exists)
  SELECT id INTO previous_listing_id_var
  FROM property_tenant_requests
  WHERE property_id = target_property_id
    AND unit_id IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  -- Create NEW listing record as a re-listing
  INSERT INTO property_tenant_requests (
    property_id,
    requested_by,
    status,
    listing_event_type,
    previous_listing_id,
    notes
  ) VALUES (
    target_property_id,
    auth.uid(),
    'active',
    CASE 
      WHEN previous_listing_id_var IS NOT NULL THEN 're_listing'
      ELSE 'initial_listing'
    END,
    previous_listing_id_var,
    CASE 
      WHEN previous_listing_id_var IS NOT NULL THEN 'Property re-listed on marketplace'
      ELSE 'Property initially listed on marketplace'
    END
  ) RETURNING id INTO new_listing_id;

  -- Update property status
  UPDATE properties
  SET 
    status = 'available',
    on_market = true,
    listed_at = NOW()
  WHERE id = target_property_id;

  RETURN new_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for unit delisting
CREATE OR REPLACE FUNCTION deactivate_unit(target_unit_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Update the active listing request to inactive
  UPDATE property_tenant_requests
  SET 
    status = 'inactive',
    delisted_at = NOW(),
    updated_at = NOW()
  WHERE unit_id = target_unit_id
    AND status = 'active';

  -- Mark associated contracts as inactive
  UPDATE property_listing_contracts
  SET contract_status = 'inactive'
  WHERE unit_id = target_unit_id
    AND contract_status = 'active';

  -- Update unit status
  UPDATE property_units
  SET 
    on_market = false,
    delisted_at = NOW()
  WHERE id = target_unit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for unit re-listing
CREATE OR REPLACE FUNCTION reactivate_unit(target_unit_id UUID, target_property_id UUID)
RETURNS UUID AS $$
DECLARE
  previous_listing_id_var UUID;
  new_listing_id UUID;
BEGIN
  -- Find the most recent listing (if exists)
  SELECT id INTO previous_listing_id_var
  FROM property_tenant_requests
  WHERE unit_id = target_unit_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- Create NEW listing record as a re-listing
  INSERT INTO property_tenant_requests (
    property_id,
    unit_id,
    requested_by,
    status,
    listing_event_type,
    previous_listing_id,
    notes
  ) VALUES (
    target_property_id,
    target_unit_id,
    auth.uid(),
    'active',
    CASE 
      WHEN previous_listing_id_var IS NOT NULL THEN 're_listing'
      ELSE 'initial_listing'
    END,
    previous_listing_id_var,
    CASE 
      WHEN previous_listing_id_var IS NOT NULL THEN 'Unit re-listed on marketplace'
      ELSE 'Unit initially listed on marketplace'
    END
  ) RETURNING id INTO new_listing_id;

  -- Update unit status
  UPDATE property_units
  SET 
    on_market = true,
    listed_at = NOW()
  WHERE id = target_unit_id;

  -- Update property on_market if not already
  UPDATE properties
  SET on_market = true
  WHERE id = target_property_id;

  RETURN new_listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;