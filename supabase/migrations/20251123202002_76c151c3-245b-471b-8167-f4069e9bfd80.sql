-- Add new columns to property_applications table for enhanced status management

-- Add columns for primary applicant tracking
ALTER TABLE property_applications 
ADD COLUMN IF NOT EXISTS is_primary_applicant BOOLEAN DEFAULT FALSE;

-- Add columns for housing status tracking
ALTER TABLE property_applications 
ADD COLUMN IF NOT EXISTS housing_status TEXT CHECK (housing_status IN ('housed', 'housed_and_paid'));

-- Add columns for payment tracking
ALTER TABLE property_applications 
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('stripe', 'plaid', 'other'));

ALTER TABLE property_applications 
ADD COLUMN IF NOT EXISTS payment_confirmed_at TIMESTAMPTZ;

ALTER TABLE property_applications 
ADD COLUMN IF NOT EXISTS payment_confirmed_by UUID REFERENCES auth.users(id);

-- Add columns for withdrawal tracking
ALTER TABLE property_applications 
ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;

ALTER TABLE property_applications 
ADD COLUMN IF NOT EXISTS withdrawn_reason TEXT;

-- Add columns for rejection tracking
ALTER TABLE property_applications 
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

ALTER TABLE property_applications 
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id);

ALTER TABLE property_applications 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for primary applicant queries
CREATE INDEX IF NOT EXISTS idx_property_applications_primary 
ON property_applications(property_id, is_primary_applicant) 
WHERE is_primary_applicant = TRUE;

-- Create index for housing status queries
CREATE INDEX IF NOT EXISTS idx_property_applications_housing_status 
ON property_applications(housing_status) 
WHERE housing_status IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN property_applications.is_primary_applicant IS 'Marks the primary applicant for a unit - only one per property';
COMMENT ON COLUMN property_applications.housing_status IS 'Tracks housing completion status: housed or housed_and_paid';
COMMENT ON COLUMN property_applications.payment_method IS 'Payment method used: stripe, plaid, or other';
COMMENT ON COLUMN property_applications.withdrawn_at IS 'Timestamp when application was withdrawn by tenant';
COMMENT ON COLUMN property_applications.rejected_at IS 'Timestamp when application was rejected by landlord/PM';