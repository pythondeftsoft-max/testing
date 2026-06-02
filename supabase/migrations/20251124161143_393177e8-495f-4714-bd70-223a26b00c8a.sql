-- Migrate existing tenants from in_process to their correct stage
UPDATE profiles
SET pipeline_stage = CASE 
  WHEN assigned_worker_id IS NOT NULL AND territory_id IS NOT NULL THEN 'assigned'
  WHEN assigned_worker_id IS NOT NULL THEN 'assigned'
  WHEN assigned_worker_id IS NULL THEN 'unassigned'
  ELSE 'assigned'
END
WHERE user_type = 'tenant' 
  AND pipeline_stage = 'in_process';

-- Add constraint to prevent future in_process for tenants
ALTER TABLE profiles
ADD CONSTRAINT chk_tenant_no_in_process 
CHECK (
  user_type != 'tenant' OR 
  pipeline_stage IS NULL OR 
  pipeline_stage != 'in_process'
);