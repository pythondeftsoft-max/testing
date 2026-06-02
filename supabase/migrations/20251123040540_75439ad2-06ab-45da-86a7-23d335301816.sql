-- Fix 98 Euclid Ave property market status and withdraw pending application
-- This fixes an issue where the property was incorrectly taken off market

-- Set property back to on-market
UPDATE properties 
SET on_market = true 
WHERE id = 'adfc3472-56bd-4ed3-aee8-4bb7350ee199';

-- Set unit back to on-market
UPDATE property_units 
SET on_market = true 
WHERE property_id = 'adfc3472-56bd-4ed3-aee8-4bb7350ee199';

-- Withdraw Logan Rodriguez's application (complete the denial)
UPDATE marketplace_applications 
SET status = 'withdrawn'
WHERE id = '7568c27c-bcff-4448-a253-24cf3432719e';