-- Update lease renewal notifications to use specific types and remove old link values
-- This ensures type-based routing will work correctly

-- Update "Lease Renewal Request" notifications
UPDATE public.notifications 
SET 
  type = 'lease_renewal_request',
  link = NULL
WHERE (title LIKE '%Lease Renewal Request%' OR title LIKE '%lease renewal request%')
  AND type IN ('info', 'warning');

-- Update "Lease Renewal Declined" notifications  
UPDATE public.notifications 
SET 
  type = 'lease_renewal_declined',
  link = NULL
WHERE (title LIKE '%Lease Renewal Declined%' OR title LIKE '%lease renewal declined%')
  AND type = 'warning';

-- Update generic lease renewal notifications
UPDATE public.notifications 
SET 
  type = 'lease_renewal',
  link = NULL
WHERE type IN ('info', 'warning')
  AND (
    title LIKE '%lease renewal%' 
    OR title LIKE '%Lease Renewal%'
    OR category = 'Lease Management'
  )
  AND type NOT IN ('lease_renewal_request', 'lease_renewal_declined');