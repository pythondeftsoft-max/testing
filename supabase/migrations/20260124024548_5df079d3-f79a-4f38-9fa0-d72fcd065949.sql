-- Function to call the n8n property webhook when a unit becomes available
CREATE OR REPLACE FUNCTION notify_n8n_property_available()
RETURNS trigger AS $$
DECLARE
  supabase_url text;
  anon_key text;
BEGIN
  -- Only trigger when status changes TO 'available'
  IF NEW.status = 'available' AND (OLD.status IS NULL OR OLD.status != 'available') THEN
    -- Get Supabase URL from environment (set in vault)
    supabase_url := 'https://kixsdhnfzjnxikmnbipi.supabase.co';
    
    -- Make HTTP POST to the edge function
    PERFORM net.http_post(
      url := supabase_url || '/functions/v1/n8n-property-webhook',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'event', 'property_available',
        'unit_id', NEW.id,
        'property_id', NEW.property_id,
        'timestamp', now()
      )
    );
    
    RAISE LOG 'n8n property webhook triggered for unit % on property %', NEW.id, NEW.property_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_property_available ON property_units;

-- Create trigger that fires when property_units.status is updated
CREATE TRIGGER on_property_available
  AFTER UPDATE ON property_units
  FOR EACH ROW
  EXECUTE FUNCTION notify_n8n_property_available();

-- Also create an INSERT trigger for new units created as 'available'
DROP TRIGGER IF EXISTS on_property_available_insert ON property_units;

CREATE TRIGGER on_property_available_insert
  AFTER INSERT ON property_units
  FOR EACH ROW
  WHEN (NEW.status = 'available')
  EXECUTE FUNCTION notify_n8n_property_available();

-- Add comment for documentation
COMMENT ON FUNCTION notify_n8n_property_available() IS 'Triggers n8n webhook when a property unit becomes available for listing automation';