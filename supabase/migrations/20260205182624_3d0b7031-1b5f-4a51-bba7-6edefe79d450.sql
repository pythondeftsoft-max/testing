-- Clean up stale computed matches for occupied units
DELETE FROM computed_matches
WHERE unit_id IN (
  SELECT id FROM property_units 
  WHERE status = 'occupied'
);