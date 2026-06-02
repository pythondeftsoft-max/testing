-- Fix existing placement fee record to link to property push
UPDATE landlord_placement_fees 
SET property_push_id = 'c61a59b5-5e2d-47b6-8949-06cd2317f34e'
WHERE id = '51ad8416-bf8a-49ee-ad6b-a6cddd2e1b21'
  AND property_push_id IS NULL;