
-- Create enum for maintenance vendor specialties
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

-- Create enum for maintenance appointment status
CREATE TYPE maintenance_appointment_status AS ENUM (
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'rescheduled'
);

-- Create enum for maintenance cost types
CREATE TYPE maintenance_cost_type AS ENUM (
  'labor',
  'materials',
  'equipment',
  'permits',
  'other'
);

-- Create maintenance_vendors table
CREATE TABLE maintenance_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES profiles(id),
  portfolio_id UUID REFERENCES portfolios(id),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT,
  specialties maintenance_specialty[] NOT NULL DEFAULT '{}',
  hourly_rate NUMERIC(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  rating NUMERIC(3,2) DEFAULT 0,
  total_jobs INTEGER DEFAULT 0,
  notes TEXT,
  availability_schedule JSONB DEFAULT '{}',
  emergency_contact BOOLEAN DEFAULT false,
  insurance_verified BOOLEAN DEFAULT false,
  license_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- Create maintenance_appointments table
CREATE TABLE maintenance_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES maintenance_vendors(id),
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  estimated_duration INTEGER NOT NULL DEFAULT 120, -- minutes
  actual_start_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  status maintenance_appointment_status NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  tenant_confirmed BOOLEAN DEFAULT false,
  vendor_confirmed BOOLEAN DEFAULT false,
  is_recurring BOOLEAN DEFAULT false,
  recurring_pattern JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id)
);

-- Create maintenance_costs table
CREATE TABLE maintenance_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES maintenance_appointments(id),
  vendor_id UUID REFERENCES maintenance_vendors(id),
  cost_type maintenance_cost_type NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_cost NUMERIC(10,2) NOT NULL,
  total_cost NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  receipt_url TEXT,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  submitted_by UUID REFERENCES profiles(id)
);

-- Create maintenance_assignments table
CREATE TABLE maintenance_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_request_id UUID REFERENCES maintenance_requests(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES maintenance_vendors(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES profiles(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  estimated_completion_date DATE,
  priority_override TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add new columns to maintenance_requests table
ALTER TABLE maintenance_requests 
ADD COLUMN assigned_vendor_id UUID REFERENCES maintenance_vendors(id),
ADD COLUMN estimated_cost NUMERIC(10,2),
ADD COLUMN actual_cost NUMERIC(10,2),
ADD COLUMN is_recurring BOOLEAN DEFAULT false,
ADD COLUMN recurring_pattern JSONB,
ADD COLUMN next_due_date DATE,
ADD COLUMN vendor_access_token TEXT UNIQUE,
ADD COLUMN vendor_access_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN cost_approved BOOLEAN DEFAULT false,
ADD COLUMN cost_approved_by UUID REFERENCES profiles(id),
ADD COLUMN cost_approved_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on all new tables
ALTER TABLE maintenance_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for maintenance_vendors
CREATE POLICY "Account admins can manage all vendors" ON maintenance_vendors
FOR ALL USING (
  is_admin(auth.uid()) OR 
  has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type])
);

CREATE POLICY "Portfolio managers can manage portfolio vendors" ON maintenance_vendors
FOR ALL USING (
  portfolio_id IS NOT NULL AND 
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
);

CREATE POLICY "Property owners can view available vendors" ON maintenance_vendors
FOR SELECT USING (
  is_active = true AND (
    account_id IS NULL OR 
    portfolio_id IN (
      SELECT id FROM portfolios WHERE manager_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM properties p 
      WHERE p.owner_id = auth.uid() AND 
      (p.portfolio_id = maintenance_vendors.portfolio_id OR maintenance_vendors.account_id IS NOT NULL)
    )
  )
);

-- RLS Policies for maintenance_appointments
CREATE POLICY "Property owners can manage appointments" ON maintenance_appointments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM maintenance_requests mr 
    JOIN properties p ON mr.property_id = p.id 
    WHERE mr.id = maintenance_appointments.maintenance_request_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Portfolio managers can manage portfolio appointments" ON maintenance_appointments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM maintenance_requests mr 
    JOIN properties p ON mr.property_id = p.id 
    WHERE mr.id = maintenance_appointments.maintenance_request_id 
    AND p.portfolio_id IS NOT NULL
    AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  )
);

CREATE POLICY "Tenants can view their appointments" ON maintenance_appointments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM maintenance_requests mr 
    WHERE mr.id = maintenance_appointments.maintenance_request_id 
    AND mr.tenant_id = auth.uid()
  )
);

-- RLS Policies for maintenance_costs
CREATE POLICY "Property owners can manage costs" ON maintenance_costs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM maintenance_requests mr 
    JOIN properties p ON mr.property_id = p.id 
    WHERE mr.id = maintenance_costs.maintenance_request_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Portfolio managers can manage portfolio costs" ON maintenance_costs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM maintenance_requests mr 
    JOIN properties p ON mr.property_id = p.id 
    WHERE mr.id = maintenance_costs.maintenance_request_id 
    AND p.portfolio_id IS NOT NULL
    AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  )
);

CREATE POLICY "Vendors can submit costs for their jobs" ON maintenance_costs
FOR INSERT WITH CHECK (
  vendor_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM maintenance_requests mr 
    WHERE mr.id = maintenance_costs.maintenance_request_id 
    AND mr.vendor_access_token IS NOT NULL
    AND mr.vendor_access_expires_at > now()
  )
);

-- RLS Policies for maintenance_assignments
CREATE POLICY "Property owners can manage assignments" ON maintenance_assignments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM maintenance_requests mr 
    JOIN properties p ON mr.property_id = p.id 
    WHERE mr.id = maintenance_assignments.maintenance_request_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Portfolio managers can manage portfolio assignments" ON maintenance_assignments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM maintenance_requests mr 
    JOIN properties p ON mr.property_id = p.id 
    WHERE mr.id = maintenance_assignments.maintenance_request_id 
    AND p.portfolio_id IS NOT NULL
    AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  )
);

-- Create indexes for performance
CREATE INDEX idx_maintenance_vendors_portfolio_id ON maintenance_vendors(portfolio_id);
CREATE INDEX idx_maintenance_vendors_account_id ON maintenance_vendors(account_id);
CREATE INDEX idx_maintenance_vendors_specialties ON maintenance_vendors USING GIN(specialties);
CREATE INDEX idx_maintenance_appointments_request_id ON maintenance_appointments(maintenance_request_id);
CREATE INDEX idx_maintenance_appointments_vendor_id ON maintenance_appointments(vendor_id);
CREATE INDEX idx_maintenance_appointments_scheduled_date ON maintenance_appointments(scheduled_date);
CREATE INDEX idx_maintenance_costs_request_id ON maintenance_costs(maintenance_request_id);
CREATE INDEX idx_maintenance_costs_appointment_id ON maintenance_costs(appointment_id);
CREATE INDEX idx_maintenance_assignments_request_id ON maintenance_assignments(maintenance_request_id);
CREATE INDEX idx_maintenance_assignments_vendor_id ON maintenance_assignments(vendor_id);
CREATE INDEX idx_maintenance_requests_vendor_token ON maintenance_requests(vendor_access_token);

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_maintenance_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_maintenance_vendors_updated_at
  BEFORE UPDATE ON maintenance_vendors
  FOR EACH ROW EXECUTE FUNCTION update_maintenance_updated_at_column();

CREATE TRIGGER update_maintenance_appointments_updated_at
  BEFORE UPDATE ON maintenance_appointments
  FOR EACH ROW EXECUTE FUNCTION update_maintenance_updated_at_column();

CREATE TRIGGER update_maintenance_costs_updated_at
  BEFORE UPDATE ON maintenance_costs
  FOR EACH ROW EXECUTE FUNCTION update_maintenance_updated_at_column();

CREATE TRIGGER update_maintenance_assignments_updated_at
  BEFORE UPDATE ON maintenance_assignments
  FOR EACH ROW EXECUTE FUNCTION update_maintenance_updated_at_column();

-- Create helper functions for vendor management
CREATE OR REPLACE FUNCTION get_available_vendors(
  p_property_id UUID,
  p_specialty maintenance_specialty DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  company_name TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  specialties maintenance_specialty[],
  hourly_rate NUMERIC,
  rating NUMERIC,
  total_jobs INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.company_name,
    v.contact_name,
    v.phone,
    v.email,
    v.specialties,
    v.hourly_rate,
    v.rating,
    v.total_jobs
  FROM maintenance_vendors v
  JOIN properties p ON p.id = p_property_id
  WHERE v.is_active = true
    AND (
      v.account_id IS NOT NULL OR 
      v.portfolio_id = p.portfolio_id OR
      v.portfolio_id IS NULL
    )
    AND (p_specialty IS NULL OR p_specialty = ANY(v.specialties))
  ORDER BY v.rating DESC, v.total_jobs DESC;
END;
$$;

-- Create function to check vendor availability
CREATE OR REPLACE FUNCTION check_vendor_availability(
  p_vendor_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_duration INTEGER DEFAULT 120
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO conflict_count
  FROM maintenance_appointments
  WHERE vendor_id = p_vendor_id
    AND status NOT IN ('cancelled', 'completed')
    AND (
      (scheduled_date <= p_start_time AND scheduled_date + (estimated_duration || ' minutes')::INTERVAL > p_start_time) OR
      (scheduled_date < p_start_time + (p_duration || ' minutes')::INTERVAL AND scheduled_date >= p_start_time)
    );
  
  RETURN conflict_count = 0;
END;
$$;

-- Create function to generate vendor access token
CREATE OR REPLACE FUNCTION generate_vendor_access_token(
  p_maintenance_request_id UUID,
  p_vendor_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
BEGIN
  -- Generate random token
  v_token := encode(gen_random_bytes(32), 'base64');
  
  -- Update maintenance request with token and expiration
  UPDATE maintenance_requests
  SET vendor_access_token = v_token,
      vendor_access_expires_at = now() + INTERVAL '7 days'
  WHERE id = p_maintenance_request_id
    AND assigned_vendor_id = p_vendor_id;
  
  RETURN v_token;
END;
$$;
