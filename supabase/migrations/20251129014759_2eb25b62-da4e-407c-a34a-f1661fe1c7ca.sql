-- Fix property unit pipeline stage to lease_signed for linking with tenant
UPDATE property_units 
SET pipeline_stage = 'lease_signed'
WHERE id = 'befcf220-cd88-43fa-b2a8-74465500fcdc';