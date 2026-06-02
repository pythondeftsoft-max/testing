-- Fix the link_status for the current placement fee record so it's active
UPDATE landlord_placement_fees
SET link_status = 'active'
WHERE id = 'd6e9231c-a934-46c4-8ac3-27ca35b9f6e4';