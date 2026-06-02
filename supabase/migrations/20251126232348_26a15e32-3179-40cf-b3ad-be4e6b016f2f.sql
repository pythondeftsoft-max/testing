-- Fix property unit befcf220-cd88-43fa-b2a8-74465500fcdc
-- Set pipeline_stage to 'lease_signed' and link tenant
UPDATE property_units 
SET 
  pipeline_stage = 'lease_signed',
  tenant_id = '01669022-a31a-4746-bf9f-45c8b9733e21',
  updated_at = NOW()
WHERE id = 'befcf220-cd88-43fa-b2a8-74465500fcdc';