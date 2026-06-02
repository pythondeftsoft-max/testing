-- Add assigned_worker_id column to property_units table for matchmaker assignment
ALTER TABLE property_units 
ADD COLUMN IF NOT EXISTS assigned_worker_id UUID REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_property_units_assigned_worker 
ON property_units(assigned_worker_id);

-- Add comment for documentation
COMMENT ON COLUMN property_units.assigned_worker_id IS 'Matchmaker/worker assigned to market this unit';