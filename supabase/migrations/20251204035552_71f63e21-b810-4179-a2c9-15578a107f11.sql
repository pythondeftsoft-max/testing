-- Add tenant_collection_method column to rent_splits table
ALTER TABLE rent_splits ADD COLUMN IF NOT EXISTS tenant_collection_method text DEFAULT 'stripe' 
  CHECK (tenant_collection_method IN ('stripe', 'external'));

-- Add comment for clarity
COMMENT ON COLUMN rent_splits.tenant_collection_method IS 'How tenant portion is collected: stripe (in-app billing) or external (check, voucher, bank deposit tracked via Plaid)';