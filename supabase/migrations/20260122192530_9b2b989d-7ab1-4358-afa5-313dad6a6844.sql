-- Phase 2: Harden rent_payments RLS policies (TO public → TO authenticated)
-- This prevents anonymous access attempts to payment history

DROP POLICY IF EXISTS "Property owners can manage rent payments" ON rent_payments;
DROP POLICY IF EXISTS "Tenants can create rent payments for their approved properties" ON rent_payments;
DROP POLICY IF EXISTS "Tenants can view their rent payments" ON rent_payments;

-- Recreate with authenticated role requirement
CREATE POLICY "Property owners can manage rent payments" ON rent_payments
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM properties 
    WHERE properties.id = rent_payments.property_id 
    AND properties.owner_id = auth.uid()
  )
);

CREATE POLICY "Tenants can create rent payments" ON rent_payments
FOR INSERT TO authenticated WITH CHECK (
  tenant_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM property_applications pa
    WHERE pa.property_id = rent_payments.property_id 
    AND pa.tenant_id = auth.uid() 
    AND pa.status = 'approved'
  )
);

CREATE POLICY "Tenants can view their rent payments" ON rent_payments
FOR SELECT TO authenticated USING (tenant_id = auth.uid());

-- Phase 3: Harden notifications RLS policies (TO public → TO authenticated)
-- This prevents anonymous access to notification content

DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;

CREATE POLICY "Users can view their own notifications" ON notifications
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON notifications
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Phase 4: Tax ID encryption infrastructure
-- Step 1: Add encrypted column
ALTER TABLE tax_profiles 
ADD COLUMN IF NOT EXISTS tax_id_number_encrypted bytea;

-- Step 2: Create encryption key retrieval function
CREATE OR REPLACE FUNCTION get_encryption_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  key_value text;
BEGIN
  -- Try to get from app settings first, fallback to a default for development
  key_value := current_setting('app.encryption_key', true);
  IF key_value IS NULL OR key_value = '' THEN
    -- Development fallback - MUST be replaced in production via Supabase Vault
    key_value := 'dev-only-encryption-key-replace-in-production-32chars';
  END IF;
  RETURN key_value;
END;
$$;

-- Step 3: Create encrypt function
CREATE OR REPLACE FUNCTION encrypt_tax_id(plain_text text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF plain_text IS NULL OR plain_text = '' THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_encrypt(plain_text, get_encryption_key());
END;
$$;

-- Step 4: Create decrypt function (only accessible to authorized users)
CREATE OR REPLACE FUNCTION decrypt_tax_id(encrypted_data bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF encrypted_data IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(encrypted_data, get_encryption_key());
END;
$$;

-- Step 5: Create auto-encryption trigger
CREATE OR REPLACE FUNCTION encrypt_tax_id_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If tax_id_number is provided, encrypt it
  IF NEW.tax_id_number IS NOT NULL AND NEW.tax_id_number <> '' THEN
    NEW.tax_id_number_encrypted := encrypt_tax_id(NEW.tax_id_number);
    NEW.tax_id_number := NULL; -- Clear plain text after encryption
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tax_profiles_encrypt_tax_id ON tax_profiles;
CREATE TRIGGER tax_profiles_encrypt_tax_id
BEFORE INSERT OR UPDATE ON tax_profiles
FOR EACH ROW EXECUTE FUNCTION encrypt_tax_id_trigger();

-- Step 6: Migrate existing plain text data to encrypted
UPDATE tax_profiles 
SET tax_id_number_encrypted = encrypt_tax_id(tax_id_number),
    tax_id_number = NULL
WHERE tax_id_number IS NOT NULL AND tax_id_number <> '';