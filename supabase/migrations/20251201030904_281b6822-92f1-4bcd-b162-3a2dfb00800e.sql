-- Fix existing placement fees for 1360 scotch mountain road
-- Monthly rent: $1,900 × 40% = $760
UPDATE landlord_placement_fees
SET 
  fee_amount = 760,
  updated_at = NOW()
WHERE id IN (
  'd6e9231c-a934-46c4-8ac3-27ca35b9f6e4',
  'ad5e5e56-a2dc-41e7-b0dd-78ae8e05f6b6'
);