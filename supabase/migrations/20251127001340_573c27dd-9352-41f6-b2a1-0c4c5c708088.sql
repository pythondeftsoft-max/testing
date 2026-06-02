-- Fix property unit pipeline stage and tenant housing status
UPDATE property_units 
SET pipeline_stage = 'lease_signed'
WHERE id = 'befcf220-cd88-43fa-b2a8-74465500fcdc';

UPDATE profiles 
SET housing_status = 'approved'
WHERE id = '01669022-a31a-4746-bf9f-45c8b9733e21';