-- Block 4 Part A: PII Encryption Foundation
-- pgsodium key + helpers + encrypted columns + access log

-- 1. Create pgsodium key (idempotent via vault.secrets pointer)
DO $$
DECLARE
  v_key_id uuid;
  v_existing text;
BEGIN
  SELECT decrypted_secret INTO v_existing FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key_id' LIMIT 1;
  IF v_existing IS NULL THEN
    SELECT id INTO v_key_id FROM pgsodium.create_key(key_type := 'aead-det', name := 'pii_v1');
    PERFORM vault.create_secret(v_key_id::text, 'pii_encryption_key_id', 'PII AEAD encryption key id (pgsodium)');
  END IF;
END $$;

-- 2. Helper: get the key id
CREATE OR REPLACE FUNCTION public.get_pii_key_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT decrypted_secret::uuid FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key_id' LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_pii_key_id() FROM PUBLIC, anon, authenticated;

-- 3. Encrypt helper (context binds ciphertext to a column slot)
CREATE OR REPLACE FUNCTION public.encrypt_pii(plaintext text, context text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgsodium
AS $$
DECLARE
  v_key_id uuid;
BEGIN
  IF plaintext IS NULL OR length(plaintext) = 0 THEN RETURN NULL; END IF;
  v_key_id := public.get_pii_key_id();
  IF v_key_id IS NULL THEN RAISE EXCEPTION 'PII encryption key not configured'; END IF;
  RETURN pgsodium.crypto_aead_det_encrypt(
    convert_to(plaintext, 'utf8'),
    convert_to(context, 'utf8'),
    v_key_id
  );
END $$;

REVOKE ALL ON FUNCTION public.encrypt_pii(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_pii(text, text) TO service_role;

-- 4. Decrypt helper
CREATE OR REPLACE FUNCTION public.decrypt_pii(ciphertext bytea, context text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgsodium
AS $$
DECLARE
  v_key_id uuid;
BEGIN
  IF ciphertext IS NULL THEN RETURN NULL; END IF;
  v_key_id := public.get_pii_key_id();
  IF v_key_id IS NULL THEN RAISE EXCEPTION 'PII encryption key not configured'; END IF;
  RETURN convert_from(
    pgsodium.crypto_aead_det_decrypt(
      ciphertext,
      convert_to(context, 'utf8'),
      v_key_id
    ),
    'utf8'
  );
END $$;

REVOKE ALL ON FUNCTION public.decrypt_pii(bytea, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_pii(bytea, text) TO service_role;

-- 5. last4 helper (safe to expose)
CREATE OR REPLACE FUNCTION public.pii_last4(plaintext text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN plaintext IS NULL OR length(plaintext) < 4 THEN NULL
    ELSE right(regexp_replace(plaintext, '[^0-9A-Za-z]', '', 'g'), 4)
  END
$$;

-- 6. Add encrypted columns + last4 + verification flags (additive only)

-- tax_profiles already has tax_id_number_encrypted bytea
ALTER TABLE public.tax_profiles
  ADD COLUMN IF NOT EXISTS tax_id_last4 text,
  ADD COLUMN IF NOT EXISTS tax_id_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tax_id_verified_at timestamptz;

-- landlord_payout_profiles
ALTER TABLE public.landlord_payout_profiles
  ADD COLUMN IF NOT EXISTS account_number_encrypted bytea,
  ADD COLUMN IF NOT EXISTS routing_number_encrypted bytea,
  ADD COLUMN IF NOT EXISTS account_last4 text,
  ADD COLUMN IF NOT EXISTS routing_last4 text,
  ADD COLUMN IF NOT EXISTS bank_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_verified_at timestamptz;

-- hap_payee_configs
ALTER TABLE public.hap_payee_configs
  ADD COLUMN IF NOT EXISTS routing_number_encrypted bytea,
  ADD COLUMN IF NOT EXISTS routing_last4 text,
  ADD COLUMN IF NOT EXISTS account_last4 text;

-- agency_nacha_settings
ALTER TABLE public.agency_nacha_settings
  ADD COLUMN IF NOT EXISTS originator_account_number_encrypted bytea,
  ADD COLUMN IF NOT EXISTS odfi_routing_number_encrypted bytea,
  ADD COLUMN IF NOT EXISTS originator_account_last4 text,
  ADD COLUMN IF NOT EXISTS odfi_routing_last4 text;

-- voucher_applications
ALTER TABLE public.voucher_applications
  ADD COLUMN IF NOT EXISTS dob_encrypted bytea,
  ADD COLUMN IF NOT EXISTS dob_year smallint,
  ADD COLUMN IF NOT EXISTS dob_verified boolean NOT NULL DEFAULT false;

-- portfolio_tax_profiles
ALTER TABLE public.portfolio_tax_profiles
  ADD COLUMN IF NOT EXISTS ein_encrypted bytea,
  ADD COLUMN IF NOT EXISTS ein_last4 text,
  ADD COLUMN IF NOT EXISTS ein_verified boolean NOT NULL DEFAULT false;

-- maintenance_vendors (lower sensitivity, opportunistic)
ALTER TABLE public.maintenance_vendors
  ADD COLUMN IF NOT EXISTS license_number_encrypted bytea,
  ADD COLUMN IF NOT EXISTS license_number_last4 text;

-- 7. Revoke client SELECT on encrypted columns (defense in depth; RLS still primary gate)
REVOKE SELECT (tax_id_number_encrypted) ON public.tax_profiles FROM anon, authenticated;
REVOKE SELECT (account_number_encrypted, routing_number_encrypted) ON public.landlord_payout_profiles FROM anon, authenticated;
REVOKE SELECT (routing_number_encrypted, account_number_encrypted) ON public.hap_payee_configs FROM anon, authenticated;
REVOKE SELECT (originator_account_number_encrypted, odfi_routing_number_encrypted) ON public.agency_nacha_settings FROM anon, authenticated;
REVOKE SELECT (dob_encrypted) ON public.voucher_applications FROM anon, authenticated;
REVOKE SELECT (ein_encrypted) ON public.portfolio_tax_profiles FROM anon, authenticated;
REVOKE SELECT (license_number_encrypted) ON public.maintenance_vendors FROM anon, authenticated;

-- 8. PII access audit log
CREATE TABLE IF NOT EXISTS public.pii_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_role text,
  target_table text NOT NULL,
  target_row_id text,
  field text NOT NULL,
  action text NOT NULL CHECK (action IN ('store','reveal','verify','purge')),
  reason text,
  ip text,
  user_agent text,
  agency_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pii_access_log_actor ON public.pii_access_log(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pii_access_log_target ON public.pii_access_log(target_table, target_row_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pii_access_log_created ON public.pii_access_log(created_at DESC);

ALTER TABLE public.pii_access_log ENABLE ROW LEVEL SECURITY;

-- Admins read; service_role writes (service_role bypasses RLS but be explicit)
CREATE POLICY "Admins can view PII access log"
  ON public.pii_access_log FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role can insert PII access log"
  ON public.pii_access_log FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON TABLE public.pii_access_log IS 'Audit trail for every read/write of encrypted PII via pii-vault edge function. Append-only.';