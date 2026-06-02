-- Add landlord signature columns to property_applications table
ALTER TABLE property_applications
ADD COLUMN IF NOT EXISTS landlord_signature_name TEXT,
ADD COLUMN IF NOT EXISTS landlord_signature_date TIMESTAMPTZ;