-- Backfill missing property_applications for pushes with status 'interested'
-- property_id is NOT NULL, unit_id is nullable - set unit_id to NULL to satisfy check constraint
INSERT INTO property_applications (
  tenant_id,
  property_id,
  unit_id,
  status,
  push_direction,
  application_data
)
SELECT 
  pp.tenant_id,
  pp.property_id,
  NULL,  -- unit_id must be NULL when property_id is set (per check constraint)
  'pending',
  'admin_to_tenant',
  jsonb_build_object(
    'source', 'marketplace_match',
    'push_id', pp.id,
    'notes', 'Backfilled from interested push',
    'original_unit_id', pp.unit_id
  )
FROM property_pushes pp
LEFT JOIN property_applications pa 
  ON pa.tenant_id = pp.tenant_id 
  AND pa.property_id = pp.property_id
WHERE pp.status = 'interested'
  AND pa.id IS NULL;