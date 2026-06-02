
-- Step 1: Database Schema Foundation
-- Create required enums first
CREATE TYPE maintenance_specialty AS ENUM (
  'plumbing',
  'electrical', 
  'hvac',
  'appliance_repair',
  'flooring',
  'painting',
  'roofing',
  'landscaping',
  'general_handyman',
  'cleaning',
  'pest_control',
  'security_systems',
  'other'
);

CREATE TYPE maintenance_appointment_status AS ENUM (
  'scheduled',
  'confirmed', 
  'in_progress',
  'completed',
  'cancelled',
  'rescheduled'
);

CREATE TYPE maintenance_cost_type AS ENUM (
  'labor',
  'materials',
  'equipment', 
  'permits',
  'other'
);

-- Create maintenance_vendors table
CREATE TABLE IF NOT EXISTS maintenance_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES auth.users(id),
  portfolio_id UUID REFERENCES portfolios(id),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT,
  specialties maintenance_specialty[] NOT NULL DEFAULT '{}',
  hourly_rate NUMERIC(10,2),
  rating NUMERIC(3,2) DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  notes TEXT,
  availability_schedule JSONB,
  emergency_contact BOOLEAN DEFAULT FALSE,
  insurance_verified BOOLEAN DEFAULT FALSE,
  license_number TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create maintenance_assignments table
CREATE TABLE IF NOT EXISTS maintenance_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID REFERENCES maintenance_requests(id),
  vendor_id UUID REFERENCES maintenance_vendors(id),
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assignment_type TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for maintenance_vendors
ALTER TABLE maintenance_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property owners can manage their vendors" ON maintenance_vendors
  FOR ALL USING (
    account_id = auth.uid() OR 
    (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type]))
  );

CREATE POLICY "Property owners can view available vendors" ON maintenance_vendors
  FOR SELECT USING (
    is_active = TRUE AND (
      account_id = auth.uid() OR 
      portfolio_id IS NULL OR
      (portfolio_id IS NOT NULL AND has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type, 'viewer'::portfolio_role_type]))
    )
  );

-- Add RLS policies for maintenance_assignments
ALTER TABLE maintenance_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property owners can manage assignments" ON maintenance_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM maintenance_requests mr 
      JOIN properties p ON mr.property_id = p.id 
      WHERE mr.id = maintenance_assignments.maintenance_request_id 
      AND (p.owner_id = auth.uid() OR (p.portfolio_id IS NOT NULL AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])))
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_vendors_portfolio_specialty 
ON maintenance_vendors USING GIN (portfolio_id, specialties) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_maintenance_vendors_account_active 
ON maintenance_vendors (account_id, is_active);

CREATE INDEX IF NOT EXISTS idx_maintenance_assignments_request_vendor 
ON maintenance_assignments (maintenance_request_id, vendor_id) WHERE status = 'active';

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_maintenance_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_maintenance_vendors_updated_at 
  BEFORE UPDATE ON maintenance_vendors 
  FOR EACH ROW EXECUTE FUNCTION update_maintenance_updated_at_column();

CREATE TRIGGER update_maintenance_assignments_updated_at 
  BEFORE UPDATE ON maintenance_assignments 
  FOR EACH ROW EXECUTE FUNCTION update_maintenance_updated_at_column();

-- Add assigned_vendor_id column to maintenance_requests if it doesn't exist
ALTER TABLE maintenance_requests 
ADD COLUMN IF NOT EXISTS assigned_vendor_id UUID REFERENCES maintenance_vendors(id);

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_maintenance_requests_assigned_vendor 
ON maintenance_requests (assigned_vendor_id);
