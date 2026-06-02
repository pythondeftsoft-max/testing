-- Add missing lease columns to marketplace_applications table
ALTER TABLE marketplace_applications
ADD COLUMN IF NOT EXISTS lease_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lease_sent_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS lease_document_id UUID,
ADD COLUMN IF NOT EXISTS lease_method TEXT,
ADD COLUMN IF NOT EXISTS placement_fee_id UUID,
ADD COLUMN IF NOT EXISTS landlord_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tenant_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS lease_fully_executed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS landlord_signature_name TEXT,
ADD COLUMN IF NOT EXISTS landlord_signature_date TIMESTAMPTZ;