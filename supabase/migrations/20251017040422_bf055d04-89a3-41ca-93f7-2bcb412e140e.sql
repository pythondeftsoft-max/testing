-- Fix empty or null status values in property_units
UPDATE property_units
SET status = 'available'
WHERE status = '' OR status IS NULL;