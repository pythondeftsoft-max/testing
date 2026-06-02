-- Add pending_duplicate_review flag to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS pending_duplicate_review BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN properties.pending_duplicate_review IS 
'Set to true when property address matches existing admin client property. Prevents listing until admin reviews and resolves duplicate.';

-- Create function to normalize address text (if not exists)
CREATE OR REPLACE FUNCTION normalize_address_text(address TEXT)
RETURNS TEXT AS $$
BEGIN
  IF address IS NULL THEN
    RETURN '';
  END IF;
  
  RETURN LOWER(
    TRIM(
      REGEXP_REPLACE(
        REGEXP_REPLACE(address, '[^a-zA-Z0-9]+', ' ', 'g'),
        '\s+', ' ', 'g'
      )
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to detect duplicates and notify admin via messages
CREATE OR REPLACE FUNCTION check_landlord_duplicate_and_notify_admin()
RETURNS TRIGGER AS $$
DECLARE
  admin_property RECORD;
  landlord_profile RECORD;
  message_subject TEXT;
  message_body TEXT;
BEGIN
  -- Only check for landlord/PM created properties (not admin)
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = NEW.owner_id 
    AND user_type = 'admin'
  ) THEN
    RETURN NEW;
  END IF;

  -- Check if any admin has this address as a client property
  FOR admin_property IN
    SELECT 
      p.id as property_id,
      p.address,
      p.owner_id as admin_id,
      port.client_name,
      port.portfolio_name
    FROM properties p
    JOIN portfolios port ON p.portfolio_id = port.id
    JOIN profiles prof ON p.owner_id = prof.id
    WHERE 
      prof.user_type = 'admin'
      AND p.deleted_at IS NULL
      AND normalize_address_text(p.address) = normalize_address_text(NEW.address)
      AND port.client_name IS NOT NULL
      AND p.id != NEW.id
  LOOP
    -- Get landlord details
    SELECT 
      full_name,
      email,
      phone_number,
      user_type
    INTO landlord_profile
    FROM profiles
    WHERE id = NEW.owner_id;

    -- Set duplicate review flag on the NEW landlord property
    UPDATE properties 
    SET pending_duplicate_review = TRUE 
    WHERE id = NEW.id;

    -- Build message subject and body
    message_subject := 'Duplicate Property Alert: ' || NEW.address;
    message_body := format(
      E'A landlord has added a property that matches your client property:\n\n' ||
      E'**Property Address:** %s\n\n' ||
      E'**Your Client Property:**\n' ||
      E'- Client: %s\n' ||
      E'- Portfolio: %s\n' ||
      E'- Property ID: %s\n\n' ||
      E'**Landlord Who Added Property:**\n' ||
      E'- Name: %s\n' ||
      E'- Email: %s\n' ||
      E'- Phone: %s\n' ||
      E'- User Type: %s\n' ||
      E'- Property ID: %s\n\n' ||
      E'**Action Required:**\n' ||
      E'The landlord''s property has been flagged and cannot be listed to marketplace until this duplicate is resolved. ' ||
      E'Please verify ownership by contacting the landlord and/or your client. ' ||
      E'Once verified, you can resolve this by either deleting one property or clearing the duplicate flag.',
      NEW.address,
      admin_property.client_name,
      admin_property.portfolio_name,
      admin_property.property_id,
      COALESCE(landlord_profile.full_name, 'Unknown'),
      COALESCE(landlord_profile.email, 'Not provided'),
      COALESCE(landlord_profile.phone_number, 'Not provided'),
      COALESCE(landlord_profile.user_type, 'unknown'),
      NEW.id
    );

    -- Insert admin message
    INSERT INTO admin_messages (
      admin_user_id,
      recipient_user_id,
      subject,
      message_text,
      message_type,
      read,
      is_bulk_message
    ) VALUES (
      admin_property.admin_id,
      admin_property.admin_id,
      message_subject,
      message_body,
      'urgent',
      FALSE,
      FALSE
    );

    -- Log to security audit
    INSERT INTO security_audit_log (
      user_id,
      action,
      resource_type,
      resource_id,
      details
    ) VALUES (
      NEW.owner_id,
      'duplicate_property_detected',
      'property',
      NEW.id,
      jsonb_build_object(
        'address', NEW.address,
        'admin_property_id', admin_property.property_id,
        'client_name', admin_property.client_name,
        'landlord_id', NEW.owner_id,
        'landlord_email', landlord_profile.email
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS landlord_duplicate_check_trigger ON properties;
CREATE TRIGGER landlord_duplicate_check_trigger
AFTER INSERT ON properties
FOR EACH ROW
EXECUTE FUNCTION check_landlord_duplicate_and_notify_admin();