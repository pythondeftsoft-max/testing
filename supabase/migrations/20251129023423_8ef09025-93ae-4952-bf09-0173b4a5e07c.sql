-- Update property unit to lease_signed stage for tenant test2
UPDATE property_units 
SET pipeline_stage = 'lease_signed',
    updated_at = now()
WHERE id = 'befcf220-cd88-43fa-b2a8-74465500fcdc'
  AND tenant_id = '01669022-a31a-4746-bf9f-45c8b9733e21';