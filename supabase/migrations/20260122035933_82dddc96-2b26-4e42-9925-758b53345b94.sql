-- Add preferred_language column to profiles table
-- All existing and new users default to English ('en')
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'en';

-- Add constraint to ensure only valid language codes
ALTER TABLE profiles 
ADD CONSTRAINT valid_language_code 
CHECK (preferred_language IN ('en', 'es', 'pt', 'fr', 'it', 'de', 'vi', 'zh', 'ja', 'ko', 'hi', 'ru', 'ar'));