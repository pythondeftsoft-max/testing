-- Add marketplace_application_id column to landlord_placement_fees
ALTER TABLE landlord_placement_fees
ADD COLUMN IF NOT EXISTS marketplace_application_id uuid REFERENCES marketplace_applications(id) ON DELETE SET NULL;