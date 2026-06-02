-- Fix notification links: Update invalid/old routes to correct application routes

-- Fix lease renewal links
UPDATE notifications 
SET link = '/dashboard' 
WHERE link = '/tenant/lease-renewal';

-- Fix maintenance links
UPDATE notifications 
SET link = '/maintenance' 
WHERE link = '/maintenance-requests';

-- Fix payment links
UPDATE notifications 
SET link = '/payments' 
WHERE link = '/rent-payments';