-- Manually fix current data for the test case
-- Fix property unit pipeline_stage
UPDATE property_units
SET pipeline_stage = 'filled_awaiting_payment'
WHERE id = 'befcf220-cd88-43fa-b2a8-74465500fcdc';

-- Fix placement fee amount  
UPDATE landlord_placement_fees
SET fee_amount = 1900
WHERE id = 'ad5e5e56-a2dc-41e7-b0dd-78ae8e05f6b6';