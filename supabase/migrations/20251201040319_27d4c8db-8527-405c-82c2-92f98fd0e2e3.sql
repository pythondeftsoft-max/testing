-- Fix Unit 2 that was housed before edge function fix was deployed
-- This unit has a housed tenant but wasn't properly marked as occupied/off-market
UPDATE property_units 
SET 
  on_market = false,
  status = 'occupied'
WHERE id = 'befcf220-cd88-43fa-b2a8-74465500fcdc';