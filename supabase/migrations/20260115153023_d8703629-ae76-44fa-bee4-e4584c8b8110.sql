-- Backfill existing property_units with photos from their parent properties
-- This fixes properties that were created before photos were propagated to units
UPDATE property_units u
SET photos = p.photos
FROM properties p
WHERE u.property_id = p.id
AND (u.photos IS NULL OR array_length(u.photos, 1) IS NULL OR array_length(u.photos, 1) = 0)
AND p.photos IS NOT NULL
AND array_length(p.photos, 1) > 0;