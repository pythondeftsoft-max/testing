-- Fix lease renewal completion by allowing 'completed' status
-- This fixes the constraint violation that prevents lease renewals from completing

-- Drop the existing check constraint that only allows limited status values
ALTER TABLE public.lease_renewals DROP CONSTRAINT IF EXISTS lease_renewals_renewal_status_check;

-- Add new check constraint that includes 'completed' status
ALTER TABLE public.lease_renewals ADD CONSTRAINT lease_renewals_renewal_status_check 
  CHECK (renewal_status IN ('pending', 'sent', 'accepted', 'declined', 'expired', 'completed'));

-- Update any existing lease renewals that should be completed
-- (where both landlord and tenant have signed the contract)
UPDATE public.lease_renewals 
SET renewal_status = 'completed', updated_at = NOW()
WHERE id IN (
  SELECT lr.id 
  FROM lease_renewals lr
  JOIN lease_renewal_contracts lrc ON lr.id = lrc.lease_renewal_id
  WHERE lrc.contract_status = 'completed' 
  AND lrc.landlord_signed_at IS NOT NULL 
  AND lrc.tenant_signed_at IS NOT NULL
  AND lr.renewal_status != 'completed'
);