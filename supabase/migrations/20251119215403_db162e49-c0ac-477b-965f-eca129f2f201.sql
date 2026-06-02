-- Function to log property pipeline changes
CREATE OR REPLACE FUNCTION log_property_pipeline_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if pipeline_stage actually changed
  IF (TG_OP = 'UPDATE' AND OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage) OR 
     (TG_OP = 'INSERT' AND NEW.pipeline_stage IS NOT NULL) THEN
    
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

-- Create trigger
DROP TRIGGER IF EXISTS property_pipeline_change_trigger ON property_units;
CREATE TRIGGER property_pipeline_change_trigger
AFTER INSERT OR UPDATE OF pipeline_stage ON property_units
FOR EACH ROW
EXECUTE FUNCTION log_property_pipeline_change();