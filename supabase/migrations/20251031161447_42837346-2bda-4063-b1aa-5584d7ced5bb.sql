-- Migration: Add Worker Assignment and Entity Tracking
-- Phase 1: Add worker assignment to profiles (tenants)

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS assigned_worker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS housing_status TEXT DEFAULT 'seeking',
ADD COLUMN IF NOT EXISTS worker_assigned_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_profiles_assigned_worker ON profiles(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_profiles_housing_status ON profiles(housing_status);

COMMENT ON COLUMN profiles.assigned_worker_id IS 'Matchmaker/worker assigned to help this tenant find housing';
COMMENT ON COLUMN profiles.housing_status IS 'Current housing search status: seeking, applied, approved, housed, inactive';
COMMENT ON COLUMN profiles.worker_assigned_at IS 'Timestamp when worker was assigned to this tenant';

-- Phase 2: Add worker assignment to properties

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS assigned_worker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS vacancy_status TEXT DEFAULT 'available',
ADD COLUMN IF NOT EXISTS worker_assigned_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_properties_assigned_worker ON properties(assigned_worker_id);
CREATE INDEX IF NOT EXISTS idx_properties_vacancy_status ON properties(vacancy_status);

COMMENT ON COLUMN properties.assigned_worker_id IS 'Matchmaker/worker assigned to manage this property vacancy';
COMMENT ON COLUMN properties.vacancy_status IS 'Current vacancy status: available, showing, pending_approval, filled';
COMMENT ON COLUMN properties.worker_assigned_at IS 'Timestamp when worker was assigned to this property';

-- Phase 3: Add tracking fields to applications

ALTER TABLE property_applications
ADD COLUMN IF NOT EXISTS push_direction TEXT,
ADD COLUMN IF NOT EXISTS landlord_viewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS landlord_response TEXT;

CREATE INDEX IF NOT EXISTS idx_applications_push_direction ON property_applications(push_direction);
CREATE INDEX IF NOT EXISTS idx_applications_landlord_response ON property_applications(landlord_response);

COMMENT ON COLUMN property_applications.push_direction IS 'Direction of match: tenant_to_property or property_to_tenant';
COMMENT ON COLUMN property_applications.landlord_viewed_at IS 'When landlord first viewed this application';
COMMENT ON COLUMN property_applications.landlord_response IS 'Landlord response: approved, denied, pending';