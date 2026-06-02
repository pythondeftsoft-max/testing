-- Add new timestamp fields to unit_applications table for tracking pipeline stages
ALTER TABLE unit_applications
ADD COLUMN IF NOT EXISTS lease_signed_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS move_in_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_received_date TIMESTAMP WITH TIME ZONE;

-- Add comment for documentation
COMMENT ON COLUMN unit_applications.lease_signed_date IS 'Date when lease was signed/approved';
COMMENT ON COLUMN unit_applications.move_in_date IS 'Date when tenant actually moved in';
COMMENT ON COLUMN unit_applications.payment_due_date IS 'Date when placement fee payment is expected';
COMMENT ON COLUMN unit_applications.payment_received_date IS 'Date when placement fee was received';

-- Add constraint: payment_received_date can only be set when priority_payment_made is true
ALTER TABLE unit_applications
ADD CONSTRAINT payment_received_date_check 
CHECK (
  (payment_received_date IS NULL) OR 
  (payment_received_date IS NOT NULL AND priority_payment_made = true)
);

-- Update existing records: if priority_payment_made is true but no date, set to updated_at
UPDATE unit_applications
SET payment_received_date = updated_at
WHERE priority_payment_made = true AND payment_received_date IS NULL;