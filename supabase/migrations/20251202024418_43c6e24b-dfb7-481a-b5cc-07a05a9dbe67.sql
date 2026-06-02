-- Add RLS policy to allow tenants to view properties they have lease renewals for
CREATE POLICY "Tenants can view properties with their lease renewals"
ON properties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM lease_renewals 
    WHERE lease_renewals.property_id = properties.id 
    AND lease_renewals.tenant_id = auth.uid()
  )
);

-- Add new columns to lease_renewals table for voucher tenant support and rent due date
ALTER TABLE lease_renewals
ADD COLUMN IF NOT EXISTS new_hap_portion numeric,
ADD COLUMN IF NOT EXISTS new_tenant_portion numeric,
ADD COLUMN IF NOT EXISTS new_rent_due_day integer CHECK (new_rent_due_day >= 1 AND new_rent_due_day <= 31);