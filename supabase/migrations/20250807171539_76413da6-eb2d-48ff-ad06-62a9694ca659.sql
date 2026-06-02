
-- Update all properties with unit_count = 0 to have unit_count = 1 for single-family properties
UPDATE properties 
SET unit_count = 1 
WHERE unit_count = 0 OR unit_count IS NULL;

-- Add a check constraint to ensure unit_count is always at least 1
ALTER TABLE properties 
ADD CONSTRAINT check_unit_count_minimum 
CHECK (unit_count >= 1);

-- Update the constraint to allow existing data and future inserts
ALTER TABLE properties 
ALTER COLUMN unit_count SET DEFAULT 1;

-- Ensure unit_count is not null
UPDATE properties 
SET unit_count = 1 
WHERE unit_count IS NULL;

ALTER TABLE properties 
ALTER COLUMN unit_count SET NOT NULL;
