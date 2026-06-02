-- =============================================
-- PRESERVE MESSAGES AND PAYMENT HISTORY
-- Change CASCADE DELETE to SET NULL and add snapshot columns
-- =============================================

-- 1. Add snapshot columns to messages table for historical context
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_email TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS tenant_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS landlord_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS landlord_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS property_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS property_address TEXT;

-- 2. Make sender_id nullable before changing constraint
ALTER TABLE messages ALTER COLUMN sender_id DROP NOT NULL;

-- 3. Drop existing CASCADE constraints on messages
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_property_application_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_marketplace_application_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_unit_application_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_property_push_id_fkey;

-- 4. Re-add with SET NULL behavior
ALTER TABLE messages 
  ADD CONSTRAINT messages_property_application_id_fkey 
  FOREIGN KEY (property_application_id) REFERENCES property_applications(id) ON DELETE SET NULL;

ALTER TABLE messages 
  ADD CONSTRAINT messages_marketplace_application_id_fkey 
  FOREIGN KEY (marketplace_application_id) REFERENCES marketplace_applications(id) ON DELETE SET NULL;

ALTER TABLE messages 
  ADD CONSTRAINT messages_unit_application_id_fkey 
  FOREIGN KEY (unit_application_id) REFERENCES unit_applications(id) ON DELETE SET NULL;

ALTER TABLE messages 
  ADD CONSTRAINT messages_sender_id_fkey 
  FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE messages 
  ADD CONSTRAINT messages_property_push_id_fkey 
  FOREIGN KEY (property_push_id) REFERENCES property_pushes(id) ON DELETE SET NULL;

-- 5. Create trigger function to populate snapshot data on message insert
CREATE OR REPLACE FUNCTION populate_message_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  sender_profile RECORD;
  app_data RECORD;
BEGIN
  -- Get sender info
  IF NEW.sender_id IS NOT NULL THEN
    SELECT first_name, last_name, email INTO sender_profile
    FROM profiles WHERE id = NEW.sender_id;
    
    NEW.sender_name := COALESCE(NULLIF(TRIM(COALESCE(sender_profile.first_name, '') || ' ' || COALESCE(sender_profile.last_name, '')), ''), 'Unknown');
    NEW.sender_email := sender_profile.email;
  END IF;

  -- Get application context from property_applications
  IF NEW.property_application_id IS NOT NULL THEN
    SELECT 
      pa.tenant_id,
      COALESCE(NULLIF(TRIM(COALESCE(tp.first_name, '') || ' ' || COALESCE(tp.last_name, '')), ''), 'Unknown') as tenant_name,
      p.owner_id as landlord_id,
      COALESCE(NULLIF(TRIM(COALESCE(lp.first_name, '') || ' ' || COALESCE(lp.last_name, '')), ''), 'Unknown') as landlord_name,
      p.id as property_id,
      p.address as property_address
    INTO app_data
    FROM property_applications pa
    LEFT JOIN profiles tp ON pa.tenant_id = tp.id
    LEFT JOIN properties p ON pa.property_id = p.id
    LEFT JOIN profiles lp ON p.owner_id = lp.id
    WHERE pa.id = NEW.property_application_id;
    
    NEW.tenant_id := COALESCE(NEW.tenant_id, app_data.tenant_id);
    NEW.tenant_name := COALESCE(NEW.tenant_name, app_data.tenant_name);
    NEW.landlord_id := COALESCE(NEW.landlord_id, app_data.landlord_id);
    NEW.landlord_name := COALESCE(NEW.landlord_name, app_data.landlord_name);
    NEW.property_id := COALESCE(NEW.property_id, app_data.property_id);
    NEW.property_address := COALESCE(NEW.property_address, app_data.property_address);
  END IF;

  -- Get application context from marketplace_applications (uses user_id not tenant_id)
  IF NEW.marketplace_application_id IS NOT NULL AND NEW.tenant_id IS NULL THEN
    SELECT 
      ma.user_id as tenant_id,
      COALESCE(NULLIF(TRIM(COALESCE(tp.first_name, '') || ' ' || COALESCE(tp.last_name, '')), ''), 'Unknown') as tenant_name,
      p.owner_id as landlord_id,
      COALESCE(NULLIF(TRIM(COALESCE(lp.first_name, '') || ' ' || COALESCE(lp.last_name, '')), ''), 'Unknown') as landlord_name,
      p.id as property_id,
      p.address as property_address
    INTO app_data
    FROM marketplace_applications ma
    LEFT JOIN profiles tp ON ma.user_id = tp.id
    LEFT JOIN properties p ON ma.property_id = p.id
    LEFT JOIN profiles lp ON p.owner_id = lp.id
    WHERE ma.id = NEW.marketplace_application_id;
    
    NEW.tenant_id := COALESCE(NEW.tenant_id, app_data.tenant_id);
    NEW.tenant_name := COALESCE(NEW.tenant_name, app_data.tenant_name);
    NEW.landlord_id := COALESCE(NEW.landlord_id, app_data.landlord_id);
    NEW.landlord_name := COALESCE(NEW.landlord_name, app_data.landlord_name);
    NEW.property_id := COALESCE(NEW.property_id, app_data.property_id);
    NEW.property_address := COALESCE(NEW.property_address, app_data.property_address);
  END IF;

  -- Get context from property_pushes
  IF NEW.property_push_id IS NOT NULL AND NEW.tenant_id IS NULL THEN
    SELECT 
      pp.tenant_id,
      COALESCE(NULLIF(TRIM(COALESCE(tp.first_name, '') || ' ' || COALESCE(tp.last_name, '')), ''), 'Unknown') as tenant_name,
      p.owner_id as landlord_id,
      COALESCE(NULLIF(TRIM(COALESCE(lp.first_name, '') || ' ' || COALESCE(lp.last_name, '')), ''), 'Unknown') as landlord_name,
      p.id as property_id,
      p.address as property_address
    INTO app_data
    FROM property_pushes pp
    LEFT JOIN profiles tp ON pp.tenant_id = tp.id
    LEFT JOIN properties p ON pp.property_id = p.id
    LEFT JOIN profiles lp ON p.owner_id = lp.id
    WHERE pp.id = NEW.property_push_id;
    
    NEW.tenant_id := COALESCE(NEW.tenant_id, app_data.tenant_id);
    NEW.tenant_name := COALESCE(NEW.tenant_name, app_data.tenant_name);
    NEW.landlord_id := COALESCE(NEW.landlord_id, app_data.landlord_id);
    NEW.landlord_name := COALESCE(NEW.landlord_name, app_data.landlord_name);
    NEW.property_id := COALESCE(NEW.property_id, app_data.property_id);
    NEW.property_address := COALESCE(NEW.property_address, app_data.property_address);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create the trigger
DROP TRIGGER IF EXISTS message_snapshot_trigger ON messages;
CREATE TRIGGER message_snapshot_trigger
BEFORE INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION populate_message_snapshot();

-- 7. Backfill existing messages with snapshot data
-- First, populate sender info
UPDATE messages m
SET 
  sender_name = COALESCE(NULLIF(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), ''), 'Unknown'),
  sender_email = p.email
FROM profiles p
WHERE m.sender_id = p.id AND m.sender_name IS NULL;

-- Backfill from property_applications
UPDATE messages m
SET 
  tenant_id = pa.tenant_id,
  tenant_name = COALESCE(NULLIF(TRIM(COALESCE(tp.first_name, '') || ' ' || COALESCE(tp.last_name, '')), ''), 'Unknown'),
  landlord_id = prop.owner_id,
  landlord_name = COALESCE(NULLIF(TRIM(COALESCE(lp.first_name, '') || ' ' || COALESCE(lp.last_name, '')), ''), 'Unknown'),
  property_id = prop.id,
  property_address = prop.address
FROM property_applications pa
LEFT JOIN profiles tp ON pa.tenant_id = tp.id
LEFT JOIN properties prop ON pa.property_id = prop.id
LEFT JOIN profiles lp ON prop.owner_id = lp.id
WHERE m.property_application_id = pa.id AND m.tenant_id IS NULL;

-- Backfill from marketplace_applications (uses user_id)
UPDATE messages m
SET 
  tenant_id = ma.user_id,
  tenant_name = COALESCE(NULLIF(TRIM(COALESCE(tp.first_name, '') || ' ' || COALESCE(tp.last_name, '')), ''), 'Unknown'),
  landlord_id = prop.owner_id,
  landlord_name = COALESCE(NULLIF(TRIM(COALESCE(lp.first_name, '') || ' ' || COALESCE(lp.last_name, '')), ''), 'Unknown'),
  property_id = prop.id,
  property_address = prop.address
FROM marketplace_applications ma
LEFT JOIN profiles tp ON ma.user_id = tp.id
LEFT JOIN properties prop ON ma.property_id = prop.id
LEFT JOIN profiles lp ON prop.owner_id = lp.id
WHERE m.marketplace_application_id = ma.id AND m.tenant_id IS NULL;

-- Backfill from property_pushes
UPDATE messages m
SET 
  tenant_id = pp.tenant_id,
  tenant_name = COALESCE(NULLIF(TRIM(COALESCE(tp.first_name, '') || ' ' || COALESCE(tp.last_name, '')), ''), 'Unknown'),
  landlord_id = prop.owner_id,
  landlord_name = COALESCE(NULLIF(TRIM(COALESCE(lp.first_name, '') || ' ' || COALESCE(lp.last_name, '')), ''), 'Unknown'),
  property_id = prop.id,
  property_address = prop.address
FROM property_pushes pp
LEFT JOIN profiles tp ON pp.tenant_id = tp.id
LEFT JOIN properties prop ON pp.property_id = prop.id
LEFT JOIN profiles lp ON prop.owner_id = lp.id
WHERE m.property_push_id = pp.id AND m.tenant_id IS NULL;

-- 8. Add snapshot columns to rent_payments
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS property_address TEXT;
ALTER TABLE rent_payments ADD COLUMN IF NOT EXISTS tenant_name TEXT;

-- 9. Make property_id nullable in rent_payments
ALTER TABLE rent_payments ALTER COLUMN property_id DROP NOT NULL;

-- 10. Drop existing CASCADE constraints on rent_payments
ALTER TABLE rent_payments DROP CONSTRAINT IF EXISTS rent_payments_property_id_fkey;
ALTER TABLE rent_payments DROP CONSTRAINT IF EXISTS rent_payments_unit_id_fkey;

-- 11. Re-add with SET NULL behavior
ALTER TABLE rent_payments 
  ADD CONSTRAINT rent_payments_property_id_fkey 
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL;

ALTER TABLE rent_payments 
  ADD CONSTRAINT rent_payments_unit_id_fkey 
  FOREIGN KEY (unit_id) REFERENCES property_units(id) ON DELETE SET NULL;

-- 12. Create trigger for rent_payments snapshot
CREATE OR REPLACE FUNCTION populate_rent_payment_snapshot()
RETURNS TRIGGER AS $$
DECLARE
  prop_address TEXT;
  t_name TEXT;
BEGIN
  -- Get property address
  IF NEW.property_id IS NOT NULL THEN
    SELECT address INTO prop_address FROM properties WHERE id = NEW.property_id;
    NEW.property_address := prop_address;
  END IF;
  
  -- Get tenant name
  IF NEW.tenant_id IS NOT NULL THEN
    SELECT COALESCE(NULLIF(TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')), ''), 'Unknown') 
    INTO t_name FROM profiles WHERE id = NEW.tenant_id;
    NEW.tenant_name := t_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS rent_payment_snapshot_trigger ON rent_payments;
CREATE TRIGGER rent_payment_snapshot_trigger
BEFORE INSERT ON rent_payments
FOR EACH ROW
EXECUTE FUNCTION populate_rent_payment_snapshot();

-- 13. Backfill existing rent_payments
UPDATE rent_payments rp
SET 
  property_address = p.address
FROM properties p
WHERE rp.property_id = p.id AND rp.property_address IS NULL;

UPDATE rent_payments rp
SET 
  tenant_name = COALESCE(NULLIF(TRIM(COALESCE(pr.first_name, '') || ' ' || COALESCE(pr.last_name, '')), ''), 'Unknown')
FROM profiles pr
WHERE rp.tenant_id = pr.id AND rp.tenant_name IS NULL;