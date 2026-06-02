-- Fix stale data in property_units table
-- Set units with status='occupied' but no tenant_id to status='available'
UPDATE property_units 
SET status = 'available'
WHERE status = 'occupied' 
  AND tenant_id IS NULL;