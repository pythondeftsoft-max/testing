-- Add employment and income fields to tenant_applications table
ALTER TABLE tenant_applications
ADD COLUMN monthly_income text,
ADD COLUMN employment_status text,
ADD COLUMN current_rent_portion numeric;

COMMENT ON COLUMN tenant_applications.monthly_income IS 'Income range or "I prefer not to say"';
COMMENT ON COLUMN tenant_applications.employment_status IS 'Employment status (full-time, part-time, unemployed, SSI/SSDI, etc.)';
COMMENT ON COLUMN tenant_applications.current_rent_portion IS 'Current monthly rent contribution by tenant';