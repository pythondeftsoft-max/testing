-- Add assigned_at timestamp column to property_units table
ALTER TABLE property_units 
ADD COLUMN assigned_at TIMESTAMP WITH TIME ZONE;

-- Create index for better query performance
CREATE INDEX idx_property_units_assigned_at ON property_units(assigned_at);

-- Set assigned_at to created_at for existing assigned units
UPDATE property_units 
SET assigned_at = created_at 
WHERE assigned_worker_id IS NOT NULL AND assigned_at IS NULL;