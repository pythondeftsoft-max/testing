-- Add missing columns for Twin's auto-push workflow
ALTER TABLE property_pushes 
ADD COLUMN push_type TEXT DEFAULT 'manual',
ADD COLUMN notes TEXT;