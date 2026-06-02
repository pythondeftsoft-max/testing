-- Add unit_id column to vendor_payment_records for tracking payments at unit level
ALTER TABLE vendor_payment_records 
ADD COLUMN unit_id uuid REFERENCES property_units(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_vendor_payment_records_unit_id ON vendor_payment_records(unit_id);