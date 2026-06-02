-- Update test notification data to use correct routes
UPDATE public.notifications 
SET link = '/maintenance-requests'
WHERE link = '/tenant-maintenance-requests';

UPDATE public.notifications 
SET link = '/rent-payments'
WHERE link = '/tenant-rent-payments';

UPDATE public.notifications 
SET link = '/applications'
WHERE link = '/tenant-applications';

UPDATE public.notifications 
SET link = '/dashboard'
WHERE link = '/tenant-dashboard';

-- Remove the tenant-profile link since that route should be handled by fallback logic
UPDATE public.notifications 
SET link = NULL
WHERE link = '/tenant-profile';