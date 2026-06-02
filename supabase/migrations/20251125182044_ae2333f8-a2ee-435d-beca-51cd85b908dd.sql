-- Fix log_property_pipeline_change trigger to skip logging when assigned_worker_id is NULL
CREATE OR REPLACE FUNCTION log_property_pipeline_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if pipeline_stage actually changed AND we have a user to attribute it to
  IF ((TG_OP = 'UPDATE' AND OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage) OR 
      (TG_OP = 'INSERT' AND NEW.pipeline_stage IS NOT NULL))
     AND NEW.assigned_worker_id IS NOT NULL THEN
    
    INSERT INTO marketplace_events (
      event_type,
      user_id,
      metadata
    ) VALUES (
      'property_pipeline_change',
      NEW.assigned_worker_id,
      jsonb_build_object(
        'property_unit_id', NEW.id,
        'property_id', NEW.property_id,
        'previous_stage', OLD.pipeline_stage,
        'new_stage', NEW.pipeline_stage,
        'status', NEW.status,
        'on_market', NEW.on_market,
        'territory_id', NEW.territory_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;