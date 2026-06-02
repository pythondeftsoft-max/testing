-- Add paid_at column to track actual Stripe payment confirmation time
ALTER TABLE public.rent_payments 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_rent_payments_paid_at ON public.rent_payments(paid_at);

-- Backfill existing completed payments - use updated_at as approximation
UPDATE public.rent_payments 
SET paid_at = updated_at 
WHERE status = 'completed' AND paid_at IS NULL;