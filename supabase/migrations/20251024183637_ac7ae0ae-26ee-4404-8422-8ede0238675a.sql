-- Add foreign key constraint for owner_id to reference profiles
ALTER TABLE properties
ADD CONSTRAINT fk_properties_owner
FOREIGN KEY (owner_id) 
REFERENCES profiles(id)
ON DELETE SET NULL;

-- Add foreign key constraint for property_manager_id to reference profiles
ALTER TABLE properties
ADD CONSTRAINT fk_properties_property_manager
FOREIGN KEY (property_manager_id) 
REFERENCES profiles(id)
ON DELETE SET NULL;