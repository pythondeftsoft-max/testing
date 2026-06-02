-- Add missing columns to marketplace_applications that the landlord_send_lease function needs
ALTER TABLE marketplace_applications 
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id);

ALTER TABLE marketplace_applications 
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE marketplace_applications 
ADD COLUMN IF NOT EXISTS withdrawn_reason TEXT;

ALTER TABLE marketplace_applications 
ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP WITH TIME ZONE;