-- Remove ineffective geocoding trigger and function
-- These created unwanted notifications without performing actual geocoding
-- Geocoding is now handled in the application layer via edge functions

-- Drop the trigger that fires on property insert
DROP TRIGGER IF EXISTS trigger_geocode_property_on_insert ON properties;

-- Drop the function that only creates notifications
DROP FUNCTION IF EXISTS public.geocode_property_address();