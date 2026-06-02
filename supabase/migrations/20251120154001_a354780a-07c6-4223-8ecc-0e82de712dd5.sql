-- Phase 1: Database Schema Enhancements for Placement Fee Tracking

-- Add missing columns to landlord_placement_fees table
ALTER TABLE landlord_placement_fees 
ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES property_units(id),
ADD COLUMN IF NOT EXISTS admin_listed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS follow_up_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ;

-- Add admin_listed flag to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS admin_listed BOOLEAN DEFAULT FALSE;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_placement_fees_plaid_transaction 
ON landlord_placement_fees(plaid_transaction_id);

CREATE INDEX IF NOT EXISTS idx_placement_fees_unit 
ON landlord_placement_fees(unit_id);

CREATE INDEX IF NOT EXISTS idx_properties_admin_listed 
ON properties(admin_listed) WHERE admin_listed = TRUE;

CREATE INDEX IF NOT EXISTS idx_placement_fees_follow_up 
ON landlord_placement_fees(follow_up_status) WHERE follow_up_status != 'none';

-- Add comment to explain follow_up_status values
COMMENT ON COLUMN landlord_placement_fees.follow_up_status IS 'Possible values: none, reminder_sent, second_reminder, final_notice, collections';