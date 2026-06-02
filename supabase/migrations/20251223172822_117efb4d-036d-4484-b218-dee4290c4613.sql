-- Update existing 'sent' status to 'push_sent' for consistency
UPDATE property_pushes SET status = 'push_sent' WHERE status = 'sent' OR status IS NULL OR status = '';

-- Set default to 'push_sent'
ALTER TABLE property_pushes ALTER COLUMN status SET DEFAULT 'push_sent';

-- Drop sub_stage from property_units if it exists
ALTER TABLE property_units DROP COLUMN IF EXISTS sub_stage;

-- Drop sub_stage from profiles if it exists  
ALTER TABLE profiles DROP COLUMN IF EXISTS sub_stage;