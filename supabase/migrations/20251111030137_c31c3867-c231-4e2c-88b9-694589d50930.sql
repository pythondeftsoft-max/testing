-- Add client_notes field to portfolios table for internal client management
ALTER TABLE public.portfolios 
ADD COLUMN IF NOT EXISTS client_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.portfolios.client_notes IS 'Internal notes for managing external client relationships and communication history';

-- Create index for better query performance when searching notes
CREATE INDEX IF NOT EXISTS idx_portfolios_client_notes ON public.portfolios USING gin(to_tsvector('english', client_notes));
