-- Drop existing triggers
DROP TRIGGER IF EXISTS on_property_available ON property_units;
DROP TRIGGER IF EXISTS on_property_available_insert ON property_units;

-- Updated function to handle both available and vacant with on_market check
CREATE OR REPLACE FUNCTION notify_n8n_property_available()
RETURNS trigger AS $$
DECLARE
  supabase_url text;
  should_trigger boolean := false;
BEGIN
  supabase_url := 'https://kixsdhnfzjnxikmnbipi.supabase.co';
  
  -- Check if this is a new listing (INSERT or UPDATE to on-market status)
  IF TG_OP = 'INSERT' THEN
    should_trigger := NEW.status IN ('available', 'vacant') AND NEW.on_market = true;
  ELSIF TG_OP = 'UPDATE' THEN
    should_trigger := (
      NEW.status IN ('available', 'vacant') AND NEW.on_market = true
    ) AND (
      OLD.status IS NULL 
      OR OLD.status NOT IN ('available', 'vacant')
      OR OLD.on_market IS DISTINCT FROM true
    );
  END IF;
  
  IF should_trigger THEN
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/n8n-property-webhook',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'event', 'property_available',
        'unit_id', NEW.id,
        'property_id', NEW.property_id,
        'timestamp', now()
      )
    );
    RAISE LOG 'n8n webhook triggered for unit % (status: %, on_market: %)', 
              NEW.id, NEW.status, NEW.on_market;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for both INSERT and UPDATE
CREATE TRIGGER on_property_available
  AFTER UPDATE ON property_units
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_property_available();

CREATE TRIGGER on_property_available_insert
  AFTER INSERT ON property_units
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_property_available();

-- Update documentation
COMMENT ON FUNCTION notify_n8n_property_available() IS 'Triggers n8n webhook when a property unit becomes available or vacant with on_market=true for social media automation';