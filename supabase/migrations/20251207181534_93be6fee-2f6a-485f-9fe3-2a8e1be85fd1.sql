-- Add tenant_name column to rent_payments for historical preservation
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS tenant_name TEXT;

-- Add tenant_name column to hap_payments for historical preservation
ALTER TABLE hap_payments ADD COLUMN IF NOT EXISTS tenant_name TEXT;

-- Backfill existing rent_payments with tenant names
UPDATE rent_payments rp
SET tenant_name = CONCAT(p.first_name, ' ', p.last_name)
FROM profiles p
WHERE rp.tenant_id = p.id
  AND rp.tenant_name IS NULL;

-- Backfill existing hap_payments with tenant names
UPDATE hap_payments hp
SET tenant_name = CONCAT(p.first_name, ' ', p.last_name)
FROM profiles p
WHERE hp.tenant_id = p.id
  AND hp.tenant_name IS NULL;