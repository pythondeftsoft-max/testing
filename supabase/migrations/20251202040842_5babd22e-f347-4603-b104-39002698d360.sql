-- Fix data integrity: Update units with active rent_splits to occupied status
UPDATE property_units pu
SET status = 'occupied'
WHERE pu.id IN (
  SELECT DISTINCT rs.unit_id 
  FROM rent_splits rs 
  WHERE rs.unit_id IS NOT NULL
    AND rs.is_active = true
)
AND pu.status != 'occupied';