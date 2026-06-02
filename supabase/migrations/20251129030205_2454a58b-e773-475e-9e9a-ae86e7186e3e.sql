-- Fix property unit pipeline_stage for lease signed unit
-- This unit had lease signed before the function was updated
UPDATE property_units 
SET 
  pipeline_stage = 'lease_signed',
  updated_at = NOW()
WHERE id = 'befcf220-cd88-43fa-b2a8-74465500fcdc';