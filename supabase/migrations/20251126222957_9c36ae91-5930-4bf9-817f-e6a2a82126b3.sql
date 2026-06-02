-- Add topic column to messages table
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT 'general';

-- Set default for existing records
UPDATE public.messages SET topic = 'general' WHERE topic IS NULL;

-- Make it NOT NULL
ALTER TABLE public.messages ALTER COLUMN topic SET NOT NULL;
