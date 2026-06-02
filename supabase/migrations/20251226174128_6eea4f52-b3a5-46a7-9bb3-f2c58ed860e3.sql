-- Fix existing property match notifications with incorrect type/category
UPDATE notifications 
SET type = 'property_match', 
    category = 'Property',
    updated_at = now()
WHERE title LIKE '%Property Match%' 
  AND type = 'success';