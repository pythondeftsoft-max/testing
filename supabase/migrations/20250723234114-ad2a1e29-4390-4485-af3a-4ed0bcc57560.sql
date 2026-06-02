-- Fix pending account invitations for landlord4@openkey.com who already has admin_partner role
-- The role was created but invitation status was not updated due to the edge function bug

UPDATE public.account_invitations 
SET 
  status = 'accepted',
  accepted_at = '2025-07-22 01:04:20.627232+00'::timestamp with time zone,
  updated_at = now()
WHERE email = 'landlord4@openkey.com' 
  AND role = 'admin_partner' 
  AND status = 'pending';