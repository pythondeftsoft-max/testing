
-- Delete all property geocoding notifications (test notifications)
DELETE FROM public.notifications 
WHERE title = 'Property Geocoding' 
AND description LIKE 'Geocoding requested for property at:%';
