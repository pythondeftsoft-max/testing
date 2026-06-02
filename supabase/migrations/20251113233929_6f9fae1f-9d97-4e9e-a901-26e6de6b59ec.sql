-- Drop the old foreign key that points to auth.users
ALTER TABLE property_units
DROP CONSTRAINT IF EXISTS property_units_assigned_worker_id_fkey;

-- Add new foreign key that points to profiles
ALTER TABLE property_units
ADD CONSTRAINT property_units_assigned_worker_id_fkey
FOREIGN KEY (assigned_worker_id)
REFERENCES profiles(id)
ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_property_units_assigned_worker 
ON property_units(assigned_worker_id) 
WHERE assigned_worker_id IS NOT NULL;