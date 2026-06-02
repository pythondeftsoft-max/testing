-- Fix tenant_id for units based on housed applications
UPDATE property_units pu
SET tenant_id = ma.user_id
FROM marketplace_applications ma
WHERE ma.unit_id = pu.id
  AND ma.status = 'housed'
  AND pu.tenant_id IS NULL;

-- Backfill tenant_id on HAP payments that have units with tenants
UPDATE hap_payments hp
SET tenant_id = pu.tenant_id
FROM property_units pu
WHERE hp.unit_id = pu.id
  AND hp.tenant_id IS NULL
  AND pu.tenant_id IS NOT NULL;