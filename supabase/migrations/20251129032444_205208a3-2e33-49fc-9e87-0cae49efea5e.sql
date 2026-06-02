-- Fix the ensure_in_process_stage_consistency trigger to allow progression past in_process
CREATE OR REPLACE FUNCTION public.ensure_in_process_stage_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_territory_id UUID;
  v_worker_id UUID;
BEGIN
  -- Only force in_process if coming from an EARLIER stage (or NULL)
  -- Don't override if already in a LATER stage (lease_signed, filled_awaiting_payment, paid_housed)
  IF NEW.primary_applicant_id IS NOT NULL AND 
     (NEW.pipeline_stage IS NULL OR NEW.pipeline_stage IN ('available', 'assigned')) THEN
    NEW.pipeline_stage := 'in_process';
  END IF;
  
  -- If moving to in_process and no worker assigned, auto-assign one
  IF NEW.pipeline_stage = 'in_process' AND NEW.assigned_worker_id IS NULL THEN
    -- Get property territory
    SELECT territory_id INTO v_territory_id
    FROM properties
    WHERE id = NEW.property_id;
    
    -- Get least loaded worker for this territory
    IF v_territory_id IS NOT NULL THEN
      SELECT w.id INTO v_worker_id
      FROM workers w
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as property_count
        FROM property_units pu
        WHERE pu.assigned_worker_id = w.id
        AND pu.pipeline_stage IN ('assigned', 'in_process')
      ) counts ON true
      WHERE w.is_active = true
      AND (w.territory_ids IS NULL OR v_territory_id = ANY(w.territory_ids))
      ORDER BY counts.property_count ASC, RANDOM()
      LIMIT 1;
      
      IF v_worker_id IS NOT NULL THEN
        NEW.assigned_worker_id := v_worker_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update the test unit to lease_signed now that the trigger is fixed
UPDATE property_units 
SET 
  pipeline_stage = 'lease_signed',
  updated_at = NOW()
WHERE id = 'befcf220-cd88-43fa-b2a8-74465500fcdc';