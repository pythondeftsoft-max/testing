-- Fix unit_count for existing properties to match actual number of units
UPDATE properties
SET unit_count = (
  SELECT COUNT(*) 
  FROM property_units 
  WHERE property_units.property_id = properties.id
)
WHERE EXISTS (
  SELECT 1 
  FROM property_units 
  WHERE property_units.property_id = properties.id
)
AND unit_count != (
  SELECT COUNT(*) 
  FROM property_units 
  WHERE property_units.property_id = properties.id
);