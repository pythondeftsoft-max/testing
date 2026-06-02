-- Migration: Auto-update unit market status on pipeline stage changes

-- =====================================================
-- PART 1: Property Units Market Status Management
-- =====================================================

CREATE OR REPLACE FUNCTION auto_update_unit_market_status_on_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if pipeline_stage actually changed
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    
    -- Moving BACKWARD from Lease Signed (filled_awaiting_payment) to Available
    -- Bring unit BACK on market
    IF OLD.pipeline_stage = 'filled_awaiting_payment' 
       AND NEW.pipeline_stage = 'available' THEN
      NEW.on_market := true;
      
    -- Moving BACKWARD from Paid to Lease Signed
    -- Keep unit OFF market (don't restore)
    ELSIF OLD.pipeline_stage = 'paid' 
          AND NEW.pipeline_stage = 'filled_awaiting_payment' THEN
      NEW.on_market := false;
      
    -- Moving FORWARD from Available to Lease Signed
    -- Take unit OFF market
    ELSIF OLD.pipeline_stage = 'available' 
          AND NEW.pipeline_stage = 'filled_awaiting_payment' THEN
      NEW.on_market := false;
      
    -- Moving FORWARD from Lease Signed to Paid
    -- Keep unit OFF market
    ELSIF OLD.pipeline_stage = 'filled_awaiting_payment' 
          AND NEW.pipeline_stage = 'paid' THEN
      NEW.on_market := false;
      
    -- Moving back to Unassigned with vacant status
    -- Bring back on market
    ELSIF NEW.pipeline_stage = 'unassigned' AND NEW.status = 'vacant' THEN
      NEW.on_market := true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to property_units table
DROP TRIGGER IF EXISTS trigger_auto_update_unit_market_status ON property_units;
CREATE TRIGGER trigger_auto_update_unit_market_status
  BEFORE UPDATE OF pipeline_stage ON property_units
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_unit_market_status_on_stage_change();

-- =====================================================
-- PART 2: Enhanced Activity Logging for Market Status
-- =====================================================

-- Update the existing stage change logging function to include market status changes
CREATE OR REPLACE FUNCTION log_unit_stage_change()
RETURNS TRIGGER AS $$
DECLARE
  changed_by_id uuid;
  changed_by_type text;
  actor_role text;
  actor_name text;
BEGIN
  -- Detect who made the change
  changed_by_id := current_setting('app.current_user_id', true)::uuid;
  changed_by_type := COALESCE(current_setting('app.actor_type', true), 'system');
  actor_role := current_setting('app.actor_role', true);
  actor_name := current_setting('app.actor_name', true);
  
  -- Log the stage change with market status info
  INSERT INTO activity_tracker (
    entity_type,
    entity_id,
    action_type,
    changed_by_id,
    changed_by_type,
    metadata
  ) VALUES (
    'property_unit',
    NEW.id,
    'stage_change',
    changed_by_id,
    changed_by_type,
    jsonb_build_object(
      'old_stage', OLD.pipeline_stage,
      'new_stage', NEW.pipeline_stage,
      'unit_number', NEW.unit_number,
      'property_id', NEW.property_id,
      'actor_role', actor_role,
      'actor_name', actor_name,
      'market_status_changed', OLD.on_market IS DISTINCT FROM NEW.on_market,
      'new_market_status', NEW.on_market,
      'market_change_reason', CASE 
        WHEN NEW.on_market = true AND OLD.on_market = false THEN 'Brought back to market'
        WHEN NEW.on_market = false AND OLD.on_market = true THEN 'Removed from market'
        ELSE 'No market status change'
      END
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;