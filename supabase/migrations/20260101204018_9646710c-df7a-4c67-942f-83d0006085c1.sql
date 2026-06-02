-- Fix incorrect placement fee: should be 40% of $1000 = $400, not $500
UPDATE landlord_placement_fees 
SET fee_amount = 400 
WHERE id = '51ad8416-bf8a-49ee-ad6b-a6cddd2e1b21';