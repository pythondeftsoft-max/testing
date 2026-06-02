-- ============================================================
-- SESSION 1A: Encrypted credentials + Payout Audit Log
-- ============================================================

-- 1. Enable pgsodium for symmetric encryption (idempotent)
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- 2. Encrypted credential storage on agency_payment_rails
--    We keep `credentials` as the legacy/plaintext column for backward compat
--    during migration, and add an encrypted bytea + a "is encrypted" flag.
--    Edge functions decrypt via SECURITY DEFINER function (service role only).
ALTER TABLE public.agency_payment_rails
  ADD COLUMN IF NOT EXISTS credentials_encrypted bytea,
  ADD COLUMN IF NOT EXISTS credentials_nonce bytea,
  ADD COLUMN IF NOT EXISTS credentials_is_encrypted boolean NOT NULL DEFAULT false;

-- Get/derive a stable agency-scoped key id from pgsodium key store.
-- We create a single platform key (pgsodium will return existing if it exists).
-- All agencies share the same key but each row has its own nonce.
DO $$
DECLARE
  existing_key uuid;
BEGIN
  SELECT id INTO existing_key
  FROM pgsodium.key
  WHERE name = 'payment_rail_credentials_key'
  LIMIT 1;

  IF existing_key IS NULL THEN
    PERFORM pgsodium.create_key(
      key_type := 'aead-det',
      name := 'payment_rail_credentials_key'
    );
  END IF;
END $$;

-- 3. Encryption helper: encrypts a JSONB credential blob and stores it on a row.
--    Service-role only — RLS-bypassing.
CREATE OR REPLACE FUNCTION public.encrypt_payment_rail_credentials(
  _rail_id uuid,
  _credentials jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgsodium
AS $$
DECLARE
  v_key_id uuid;
  v_nonce bytea;
  v_ciphertext bytea;
  v_plaintext bytea;
BEGIN
  -- Only service_role or authenticated agency admins should hit this.
  -- We rely on the calling edge function to use service role.
  SELECT id INTO v_key_id
  FROM pgsodium.key
  WHERE name = 'payment_rail_credentials_key'
  LIMIT 1;

  IF v_key_id IS NULL THEN
    RAISE EXCEPTION 'Encryption key not initialized';
  END IF;

  v_nonce := pgsodium.crypto_aead_det_noncegen();
  v_plaintext := convert_to(_credentials::text, 'UTF8');
  v_ciphertext := pgsodium.crypto_aead_det_encrypt(
    v_plaintext,
    convert_to(_rail_id::text, 'UTF8'),  -- additional data binds ciphertext to row
    v_key_id,
    v_nonce
  );

  UPDATE public.agency_payment_rails
  SET credentials_encrypted = v_ciphertext,
      credentials_nonce = v_nonce,
      credentials_is_encrypted = true,
      credentials = '{}'::jsonb,  -- wipe plaintext
      updated_at = now()
  WHERE id = _rail_id;
END;
$$;

-- 4. Decryption helper: returns the JSONB credential blob.
--    SECURITY DEFINER — only callable from edge functions via service role.
--    We deliberately do NOT grant EXECUTE to authenticated/anon.
CREATE OR REPLACE FUNCTION public.decrypt_payment_rail_credentials(
  _rail_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgsodium
AS $$
DECLARE
  v_row public.agency_payment_rails%ROWTYPE;
  v_key_id uuid;
  v_plaintext bytea;
BEGIN
  SELECT * INTO v_row FROM public.agency_payment_rails WHERE id = _rail_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment rail not found';
  END IF;

  -- If row not yet migrated, return legacy plaintext
  IF NOT v_row.credentials_is_encrypted THEN
    RETURN COALESCE(v_row.credentials, '{}'::jsonb);
  END IF;

  SELECT id INTO v_key_id
  FROM pgsodium.key
  WHERE name = 'payment_rail_credentials_key'
  LIMIT 1;

  v_plaintext := pgsodium.crypto_aead_det_decrypt(
    v_row.credentials_encrypted,
    convert_to(_rail_id::text, 'UTF8'),
    v_key_id,
    v_row.credentials_nonce
  );

  RETURN convert_from(v_plaintext, 'UTF8')::jsonb;
END;
$$;

-- Lock down execute permissions
REVOKE EXECUTE ON FUNCTION public.encrypt_payment_rail_credentials(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_payment_rail_credentials(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_payment_rail_credentials(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_payment_rail_credentials(uuid) TO service_role;

-- 5. Backfill: encrypt any existing plaintext credentials in place
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, credentials
    FROM public.agency_payment_rails
    WHERE credentials_is_encrypted = false
      AND credentials IS NOT NULL
      AND credentials::text NOT IN ('{}', 'null')
  LOOP
    PERFORM public.encrypt_payment_rail_credentials(r.id, r.credentials);
  END LOOP;
END $$;

-- 6. Trigger: prevent the credentials column from being read by anyone but service_role.
--    We mask it via a view-style guard: zero out the column on SELECT for non-service callers
--    by using an RLS policy that allows row access but the application code should never
--    select `credentials` directly anymore. The clearer protection is to revoke column SELECT.
REVOKE SELECT (credentials, credentials_encrypted, credentials_nonce)
  ON public.agency_payment_rails FROM anon, authenticated;

-- Re-grant SELECT on every OTHER column to authenticated (needed for the existing UI)
GRANT SELECT (
  id, agency_id, rail_type, display_name, is_default, is_active,
  config, verification_status, verification_error, last_verified_at,
  created_by, created_at, updated_at, credentials_is_encrypted
) ON public.agency_payment_rails TO authenticated;

-- ============================================================
-- 7. Payout Audit Log
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payout_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES public.bulk_payout_batches(id) ON DELETE SET NULL,
  item_id uuid REFERENCES public.bulk_payout_items(id) ON DELETE SET NULL,
  agency_id uuid REFERENCES public.housing_authorities(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'batch_created','batch_items_added','batch_approved','batch_processing_started',
    'batch_processing_completed','batch_failed',
    'item_sent','item_failed','item_retried','item_voided',
    'rail_credentials_updated','rail_verified','rail_deleted'
  )),
  actor_id uuid,
  actor_email text,
  actor_ip text,
  amount numeric,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_audit_batch ON public.payout_audit_log(batch_id);
CREATE INDEX IF NOT EXISTS idx_payout_audit_item ON public.payout_audit_log(item_id);
CREATE INDEX IF NOT EXISTS idx_payout_audit_agency_created ON public.payout_audit_log(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_audit_event ON public.payout_audit_log(event_type, created_at DESC);

ALTER TABLE public.payout_audit_log ENABLE ROW LEVEL SECURITY;

-- Read policy: agency staff can read their agency's events; admins can read all
CREATE POLICY "Agency staff can view their payout audit log"
  ON public.payout_audit_log
  FOR SELECT
  TO authenticated
  USING (
    public.is_agency_staff(auth.uid(), agency_id)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- No direct INSERT / UPDATE / DELETE from clients — only edge functions (service_role bypass RLS)
CREATE POLICY "No client writes to payout audit log"
  ON public.payout_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- 8. Logger helper used by edge functions / triggers
CREATE OR REPLACE FUNCTION public.log_payout_event(
  _event_type text,
  _batch_id uuid DEFAULT NULL,
  _item_id uuid DEFAULT NULL,
  _agency_id uuid DEFAULT NULL,
  _actor_id uuid DEFAULT NULL,
  _actor_email text DEFAULT NULL,
  _actor_ip text DEFAULT NULL,
  _amount numeric DEFAULT NULL,
  _before jsonb DEFAULT NULL,
  _after jsonb DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.payout_audit_log (
    event_type, batch_id, item_id, agency_id,
    actor_id, actor_email, actor_ip,
    amount, before_state, after_state, metadata
  ) VALUES (
    _event_type, _batch_id, _item_id, _agency_id,
    _actor_id, _actor_email, _actor_ip,
    _amount, _before, _after, COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_payout_event(text, uuid, uuid, uuid, uuid, text, text, numeric, jsonb, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_payout_event(text, uuid, uuid, uuid, uuid, text, text, numeric, jsonb, jsonb, jsonb) TO authenticated, service_role;

-- 9. Auto-log when a batch is created or its status changes
CREATE OR REPLACE FUNCTION public.trg_audit_bulk_payout_batches()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_payout_event(
      'batch_created',
      NEW.id, NULL, NEW.agency_id,
      NEW.created_by, NULL, NULL,
      NEW.total_amount,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('source','trigger')
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.log_payout_event(
      CASE NEW.status
        WHEN 'processing' THEN 'batch_processing_started'
        WHEN 'completed'  THEN 'batch_processing_completed'
        WHEN 'partial'    THEN 'batch_processing_completed'
        WHEN 'failed'     THEN 'batch_failed'
        ELSE 'batch_processing_completed'
      END,
      NEW.id, NULL, NEW.agency_id,
      auth.uid(), NULL, NULL,
      NEW.total_amount,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status,
                         'successful_payouts', NEW.successful_payouts,
                         'failed_payouts', NEW.failed_payouts),
      jsonb_build_object('source','trigger')
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_bulk_payout_batches ON public.bulk_payout_batches;
CREATE TRIGGER audit_bulk_payout_batches
AFTER INSERT OR UPDATE ON public.bulk_payout_batches
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_bulk_payout_batches();

-- 10. Auto-log when an item transitions to sent/failed
CREATE OR REPLACE FUNCTION public.trg_audit_bulk_payout_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency uuid;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT agency_id INTO v_agency FROM public.bulk_payout_batches WHERE id = NEW.batch_id;

    IF NEW.status = 'sent' THEN
      PERFORM public.log_payout_event(
        'item_sent',
        NEW.batch_id, NEW.id, v_agency,
        auth.uid(), NULL, NULL,
        NEW.amount,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status','sent','payout_id',NEW.payout_id),
        jsonb_build_object('rail_type', NEW.rail_type)
      );
    ELSIF NEW.status = 'failed' THEN
      PERFORM public.log_payout_event(
        'item_failed',
        NEW.batch_id, NEW.id, v_agency,
        auth.uid(), NULL, NULL,
        NEW.amount,
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status','failed','error',NEW.error_message),
        '{}'::jsonb
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_bulk_payout_items ON public.bulk_payout_items;
CREATE TRIGGER audit_bulk_payout_items
AFTER UPDATE ON public.bulk_payout_items
FOR EACH ROW EXECUTE FUNCTION public.trg_audit_bulk_payout_items();