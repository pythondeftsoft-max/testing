-- Add property_push_id column to landlord_placement_fees for push-based placements
ALTER TABLE landlord_placement_fees 
ADD COLUMN IF NOT EXISTS property_push_id UUID REFERENCES property_pushes(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_landlord_placement_fees_property_push_id 
ON landlord_placement_fees(property_push_id) 
WHERE property_push_id IS NOT NULL;