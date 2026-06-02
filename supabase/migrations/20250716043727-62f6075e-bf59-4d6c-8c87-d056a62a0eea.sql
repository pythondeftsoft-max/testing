
-- First, let's check the current constraint on tenant_type
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'tenant_invitations'::regclass 
AND contype = 'c';

-- Drop the existing constraint if it exists
ALTER TABLE public.tenant_invitations 
DROP CONSTRAINT IF EXISTS tenant_invitations_tenant_type_check;

-- Add the correct constraint to allow both 'voucher' and 'market_rate' values
ALTER TABLE public.tenant_invitations 
ADD CONSTRAINT tenant_invitations_tenant_type_check 
CHECK (tenant_type IN ('voucher', 'market_rate'));
