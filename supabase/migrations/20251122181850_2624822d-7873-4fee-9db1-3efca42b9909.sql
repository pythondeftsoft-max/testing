-- Create property_listing_contracts table to store signed housing service agreements
CREATE TABLE property_listing_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES property_units(id) ON DELETE CASCADE,
  contract_type TEXT NOT NULL DEFAULT 'housing_services_agreement',
  contract_text TEXT NOT NULL,
  
  -- Signer information
  signed_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_role TEXT NOT NULL,
  
  -- Signature details
  digital_signature TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  signature_date DATE NOT NULL,
  
  -- Associated listing
  listing_date TIMESTAMP WITH TIME ZONE NOT NULL,
  property_address TEXT NOT NULL,
  
  -- Metadata
  contract_version TEXT DEFAULT '1.0',
  ip_address TEXT,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for better query performance
CREATE INDEX idx_property_listing_contracts_property ON property_listing_contracts(property_id);
CREATE INDEX idx_property_listing_contracts_unit ON property_listing_contracts(unit_id);
CREATE INDEX idx_property_listing_contracts_signed_by ON property_listing_contracts(signed_by);
CREATE INDEX idx_property_listing_contracts_signed_at ON property_listing_contracts(signed_at DESC);

-- Enable Row Level Security
ALTER TABLE property_listing_contracts ENABLE ROW LEVEL SECURITY;

-- Admins can view all contracts
CREATE POLICY "Admins can view all contracts"
  ON property_listing_contracts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'
    )
  );

-- Property owners can view their own contracts
CREATE POLICY "Owners can view their contracts"
  ON property_listing_contracts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_listing_contracts.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Authenticated users can insert contracts (when they own the property)
CREATE POLICY "Users can create contracts for their properties"
  ON property_listing_contracts FOR INSERT
  TO authenticated
  WITH CHECK (
    signed_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_listing_contracts.property_id
      AND properties.owner_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_property_listing_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_property_listing_contracts_updated_at
  BEFORE UPDATE ON property_listing_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_property_listing_contracts_updated_at();