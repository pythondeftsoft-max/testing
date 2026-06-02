-- Add foreign key constraints to marketplace_applications table

-- Add foreign key for property_id
ALTER TABLE marketplace_applications
ADD CONSTRAINT marketplace_applications_property_id_fkey
FOREIGN KEY (property_id)
REFERENCES properties(id)
ON DELETE CASCADE;

-- Add foreign key for unit_id
ALTER TABLE marketplace_applications
ADD CONSTRAINT marketplace_applications_unit_id_fkey
FOREIGN KEY (unit_id)
REFERENCES property_units(id)
ON DELETE SET NULL;