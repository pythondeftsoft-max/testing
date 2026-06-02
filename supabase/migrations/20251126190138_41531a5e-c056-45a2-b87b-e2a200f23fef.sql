-- Fix existing tenants stuck in 'seeking' pipeline_stage when they should be 'assigned'
UPDATE profiles
SET pipeline_stage = 'assigned', updated_at = now()
WHERE user_type = 'tenant'
  AND assigned_worker_id IS NOT NULL
  AND housing_status = 'seeking'
  AND pipeline_stage = 'seeking';

-- Fix 115 monteith property - set territory and worker
UPDATE property_units
SET 
  territory_id = '104ac6f0-ffc4-4925-9eea-1c63d6e688a9',  -- Missouri
  assigned_worker_id = '84b46bc8-1e8a-4f74-9349-0f765b364018',  -- Admin User
  pipeline_stage = 'available',
  updated_at = now()
WHERE id = '263f0ad4-a4dd-4f85-ac47-38a51cebbcf7';  -- 115 monteith unit