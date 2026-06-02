-- Add foreign key constraint for property_applications.property_id -> properties.id
ALTER TABLE property_applications 
ADD CONSTRAINT fk_property_applications_property_id 
FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;