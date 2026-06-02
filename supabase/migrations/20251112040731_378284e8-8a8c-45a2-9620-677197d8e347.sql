-- Backfill Unit 1 for all existing properties that don't have property_units records

INSERT INTO property_units (
  property_id,
  unit_number,
  unit_name,
  bedrooms,
  bathrooms,
  square_feet,
  status,
  unit_amenities
)
SELECT 
  p.id as property_id,
  '1' as unit_number,
  'Unit 1' as unit_name,
  COALESCE(p.bedrooms, 0) as bedrooms,
  COALESCE(p.bathrooms, 0) as bathrooms,
  p.square_feet,
  COALESCE(p.status, 'vacant') as status,
  COALESCE(p.amenities, ARRAY[]::text[]) as unit_amenities
FROM properties p
WHERE NOT EXISTS (
  SELECT 1 
  FROM property_units pu 
  WHERE pu.property_id = p.id
)
AND p.deleted_at IS NULL;