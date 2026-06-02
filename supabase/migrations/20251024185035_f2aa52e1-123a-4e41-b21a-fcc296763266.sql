-- Create function to automatically create initial message for new applications
CREATE OR REPLACE FUNCTION create_initial_application_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_user_id UUID;
BEGIN
  -- Get the property manager or owner as the sender
  SELECT COALESCE(p.property_manager_id, p.owner_id)
  INTO sender_user_id
  FROM properties p
  WHERE p.id = NEW.property_id;
  
  -- Only create message if we have a valid sender
  IF sender_user_id IS NOT NULL THEN
    INSERT INTO messages (
      property_application_id,
      sender_id,
      message_text,
      created_by_tenant,
      read_by_tenant,
      read_by_landlord
    ) VALUES (
      NEW.id,
      sender_user_id,
      'Thank you for your application! I''ll review it and get back to you soon.',
      false,
      false,
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to fire after application insert
CREATE TRIGGER trigger_create_initial_application_message
AFTER INSERT ON property_applications
FOR EACH ROW
EXECUTE FUNCTION create_initial_application_message();