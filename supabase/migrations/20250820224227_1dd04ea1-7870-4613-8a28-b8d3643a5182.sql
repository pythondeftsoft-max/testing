
-- Add columns to properties table for better landlord/portfolio tracking
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS property_manager_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS management_company text,
ADD COLUMN IF NOT EXISTS landlord_response_time_avg numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS tenant_satisfaction_score numeric DEFAULT 0;

-- Create tenant_housing_history table to track moves within the platform
CREATE TABLE IF NOT EXISTS tenant_housing_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES profiles(id),
  property_id uuid NOT NULL REFERENCES properties(id),
  move_in_date date NOT NULL,
  move_out_date date,
  move_out_reason text,
  rent_amount numeric,
  lease_renewed boolean DEFAULT false,
  performance_score numeric DEFAULT 5.0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for tenant_housing_history
ALTER TABLE tenant_housing_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenant_housing_history
CREATE POLICY "Admins can view all tenant housing history" 
  ON tenant_housing_history FOR SELECT 
  USING (is_admin(auth.uid()));

CREATE POLICY "Property owners can view history for their properties" 
  ON tenant_housing_history FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM properties 
    WHERE properties.id = tenant_housing_history.property_id 
    AND properties.owner_id = auth.uid()
  ));

CREATE POLICY "Tenants can view their own housing history" 
  ON tenant_housing_history FOR SELECT 
  USING (tenant_id = auth.uid());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tenant_housing_history_tenant_id ON tenant_housing_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_housing_history_property_id ON tenant_housing_history(property_id);
CREATE INDEX IF NOT EXISTS idx_properties_owner_portfolio ON properties(owner_id, portfolio_id);
CREATE INDEX IF NOT EXISTS idx_tenant_communications_property_tenant ON tenant_communications(property_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_property_status ON maintenance_requests(property_id, status);

-- Update trigger for tenant_housing_history
CREATE OR REPLACE FUNCTION update_tenant_housing_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenant_housing_history_updated_at
  BEFORE UPDATE ON tenant_housing_history
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_housing_history_updated_at();
