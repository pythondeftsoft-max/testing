-- Add retracted status to lease renewals and tracking fields
-- This allows landlords to retract offers that have been sent but not yet responded to

-- Drop existing constraint if it exists
ALTER TABLE public.lease_renewals DROP CONSTRAINT IF EXISTS lease_renewals_renewal_status_check;

-- Add new constraint with retracted status
ALTER TABLE public.lease_renewals ADD CONSTRAINT lease_renewals_renewal_status_check 
  CHECK (renewal_status IN ('pending', 'sent', 'approved', 'accepted', 'declined', 'rejected', 'expired', 'completed', 'landlord_signed', 'retracted'));

-- Add columns to track retraction details
ALTER TABLE public.lease_renewals 
  ADD COLUMN IF NOT EXISTS retracted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retraction_reason TEXT;

-- Add index for performance on retracted status queries
CREATE INDEX IF NOT EXISTS idx_lease_renewals_retracted 
  ON public.lease_renewals(renewal_status) 
  WHERE renewal_status = 'retracted';