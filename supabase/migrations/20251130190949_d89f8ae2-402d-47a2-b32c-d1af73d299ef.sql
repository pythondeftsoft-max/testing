-- Fix 5194 Coney Island Avenue - set correct stage for property with primary applicant
UPDATE property_units
SET pipeline_stage = 'in_process'
WHERE id = '16d7e01e-f61e-4ddb-99dc-018affd3b787';

-- Also fix any other properties that got incorrectly set to 'paid'
UPDATE property_units 
SET pipeline_stage = 'paid_housed'
WHERE pipeline_stage = 'paid';