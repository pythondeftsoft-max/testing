-- Add voucher/rent split columns to properties table
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS is_voucher_property BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS voucher_type TEXT,
ADD COLUMN IF NOT EXISTS tenant_portion NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS voucher_portion NUMERIC(10,2);

-- Add comment for documentation
COMMENT ON COLUMN properties.is_voucher_property IS 'Whether this is a Section 8 / voucher property';
COMMENT ON COLUMN properties.voucher_type IS 'Type of voucher (e.g., Section 8, HCV, etc.)';
COMMENT ON COLUMN properties.tenant_portion IS 'Tenant portion of rent for voucher properties';
COMMENT ON COLUMN properties.voucher_portion IS 'HAP/PHA portion of rent for voucher properties';