-- Trigger function to ensure in_process consistency
CREATE OR REPLACE FUNCTION ensure_in_process_stage_consistency()
RETURNS TRIGGER AS $$
DECLARE
  v_territory_id UUID;
  v_worker_id UUID;
BEGIN
  -- If primary_applicant_id is being set and pipeline_stage isn't in_process
  IF NEW.primary_applicant_id IS NOT NULL AND 
     (NEW.pipeline_stage IS NULL OR NEW.pipeline_stage != 'in_process') THEN
    NEW.pipeline_stage := 'in_process';
  END IF;
  
  -- If moving to in_process and no worker assigned, auto-assign one
  IF NEW.pipeline_stage = 'in_process' AND NEW.assigned_worker_id IS NULL THEN
    -- Get territory from unit or property
    SELECT COALESCE(NEW.territory_id, p.territory_id) INTO v_territory_id
    FROM properties p WHERE p.id = NEW.property_id;
    
    IF v_territory_id IS NOT NULL THEN
      -- Find the worker with lowest workload for this territory
      SELECT tw.worker_id INTO v_worker_id
      FROM territory_workers tw
      WHERE tw.territory_id = v_territory_id
        AND tw.is_primary = true
      ORDER BY (
        SELECT COUNT(*) FROM property_units 
        WHERE assigned_worker_id = tw.worker_id
      ) ASC
      LIMIT 1;
      
      IF v_worker_id IS NOT NULL THEN
        NEW.assigned_worker_id := v_worker_id;
        NEW.assigned_at := NOW();
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on property_units
DROP TRIGGER IF EXISTS ensure_in_process_consistency_trigger ON property_units;
CREATE TRIGGER ensure_in_process_consistency_trigger
  BEFORE INSERT OR UPDATE ON property_units
  FOR EACH ROW
  EXECUTE FUNCTION ensure_in_process_stage_consistency();

-- Fix existing data - units with primary applicant but NULL pipeline_stage
UPDATE property_units pu
SET 
  pipeline_stage = 'in_process',
  assigned_worker_id = COALESCE(
    pu.assigned_worker_id,
    (
      SELECT tw.worker_id 
      FROM territory_workers tw 
      WHERE tw.territory_id = COALESCE(pu.territory_id, (
        SELECT p.territory_id FROM properties p WHERE p.id = pu.property_id
      ))
        AND tw.is_primary = true
      ORDER BY (
        SELECT COUNT(*) FROM property_units 
        WHERE assigned_worker_id = tw.worker_id
      ) ASC
      LIMIT 1
    )
  ),
  assigned_at = COALESCE(pu.assigned_at, NOW())
WHERE 
  primary_applicant_id IS NOT NULL 
  AND (pipeline_stage IS NULL OR pipeline_stage != 'in_process');