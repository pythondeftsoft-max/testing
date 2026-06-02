-- Fix the specific unit at 160 East Walnut Street
-- Reset to null state so auto-assign can pick it up properly

UPDATE property_units 
SET 
  bedrooms = 3,                -- Set correct bed/bath from property
  bathrooms = 1,
  assigned_worker_id = NULL,   -- Clear assignment to let auto-assign pick it up
  pipeline_stage = NULL,       -- Reset to NULL (fresh state for auto-assign)
  status = 'vacant',           -- Set proper status
  updated_at = NOW()
WHERE id = '590d2ae9-3d1a-43d7-8ccd-54cb1a747c37';

-- Also ensure any other orphaned units (available but unassigned) get reset
-- This catches units that fell into the same trap
UPDATE property_units
SET 
  pipeline_stage = NULL,       -- Reset so auto-assign picks them up
  updated_at = NOW()
WHERE pipeline_stage = 'available' 
  AND assigned_worker_id IS NULL
  AND id != '590d2ae9-3d1a-43d7-8ccd-54cb1a747c37'; -- Don't double-update the specific one