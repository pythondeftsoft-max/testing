DELETE FROM computed_matches
WHERE id IN (
  SELECT cm.id 
  FROM computed_matches cm
  JOIN profiles pr ON cm.tenant_id = pr.id
  JOIN tenant_profiles tp ON tp.user_id = pr.id
  JOIN property_units pu ON cm.unit_id = pu.id
  JOIN properties p ON pu.property_id = p.id
  WHERE tp.state != p.state 
    AND tp.state IS NOT NULL 
    AND p.state IS NOT NULL
);