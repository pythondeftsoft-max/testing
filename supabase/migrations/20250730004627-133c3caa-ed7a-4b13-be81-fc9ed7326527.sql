-- Add new fields to background_checks table for cancel and rerun functionality
ALTER TABLE public.background_checks 
ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN cancelled_by UUID REFERENCES auth.users(id),
ADD COLUMN rerun_count INTEGER DEFAULT 0,
ADD COLUMN parent_check_id UUID REFERENCES public.background_checks(id),
ADD COLUMN cancellation_reason TEXT;

-- Add new status values (existing check constraint will be updated)
-- First drop the existing constraint if it exists
ALTER TABLE public.background_checks 
DROP CONSTRAINT IF EXISTS background_checks_check_status_check;

-- Add the updated constraint with new status values
ALTER TABLE public.background_checks 
ADD CONSTRAINT background_checks_check_status_check 
CHECK (check_status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'cancelling', 'rerunning'));

-- Create index for better performance on parent_check_id lookups
CREATE INDEX IF NOT EXISTS idx_background_checks_parent_check_id ON public.background_checks(parent_check_id);

-- Create index for cancelled_at lookups
CREATE INDEX IF NOT EXISTS idx_background_checks_cancelled_at ON public.background_checks(cancelled_at) WHERE cancelled_at IS NOT NULL;