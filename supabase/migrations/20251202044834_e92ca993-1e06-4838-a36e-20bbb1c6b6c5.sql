-- Add maintenance_request_id to vendor_payment_records
ALTER TABLE vendor_payment_records
ADD COLUMN maintenance_request_id UUID REFERENCES maintenance_requests(id) ON DELETE SET NULL;