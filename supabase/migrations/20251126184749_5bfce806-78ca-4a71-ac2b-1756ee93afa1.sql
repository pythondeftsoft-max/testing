-- Fix existing properties stuck in 'in_process' stage with no primary applicant
UPDATE property_units
SET 
  pipeline_stage = 'available',
  updated_at = now()
WHERE pipeline_stage = 'in_process'
  AND primary_applicant_id IS NULL
  AND status IN ('active', 'available');