-- Fix existing lease renewal request notifications
UPDATE notifications
SET 
  type = 'lease_renewal_request',
  link = '/dashboard?tab=Lease Expirations&subTab=renewals'
WHERE 
  title = 'New Lease Renewal Request' 
  AND type = 'info';