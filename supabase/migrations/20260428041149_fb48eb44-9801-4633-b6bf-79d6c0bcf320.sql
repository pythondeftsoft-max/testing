
-- =========================================================
-- PASS 2: Landlord & Property identity linking
-- =========================================================

-- agency_landlords additions
ALTER TABLE public.agency_landlords
  ADD COLUMN IF NOT EXISTS landlord_user_id uuid,
  ADD COLUMN IF NOT EXISTS claim_token text,
  ADD COLUMN IF NOT EXISTS claim_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by_agency boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS agency_landlords_claim_token_uniq
  ON public.agency_landlords(claim_token) WHERE claim_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS agency_landlords_landlord_user_id_idx
  ON public.agency_landlords(landlord_user_id);

-- properties additions
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS created_by_agency_id uuid,
  ADD COLUMN IF NOT EXISTS claim_token text,
  ADD COLUMN IF NOT EXISTS claim_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS pending_owner_email text;

CREATE UNIQUE INDEX IF NOT EXISTS properties_claim_token_uniq
  ON public.properties(claim_token) WHERE claim_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS properties_created_by_agency_id_idx
  ON public.properties(created_by_agency_id);

-- agency_landlord_links table
CREATE TABLE IF NOT EXISTS public.agency_landlord_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  landlord_id uuid NOT NULL REFERENCES public.agency_landlords(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  role text NOT NULL DEFAULT 'owner',
  source text NOT NULL DEFAULT 'self_apply',
  acknowledged_at timestamptz,
  disputed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, agency_id, landlord_id)
);

CREATE INDEX IF NOT EXISTS agency_landlord_links_user_id_idx ON public.agency_landlord_links(user_id);
CREATE INDEX IF NOT EXISTS agency_landlord_links_agency_id_idx ON public.agency_landlord_links(agency_id);

ALTER TABLE public.agency_landlord_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own landlord links"
  ON public.agency_landlord_links FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can acknowledge/dispute their own landlord links"
  ON public.agency_landlord_links FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Agency staff can read their agency's landlord links"
  ON public.agency_landlord_links FOR SELECT
  USING (public.is_agency_staff(auth.uid(), agency_id));

CREATE POLICY "Agency staff can manage their agency's landlord links"
  ON public.agency_landlord_links FOR ALL
  USING (public.is_agency_staff(auth.uid(), agency_id))
  WITH CHECK (public.is_agency_staff(auth.uid(), agency_id));

CREATE TRIGGER trg_agency_landlord_links_updated_at
  BEFORE UPDATE ON public.agency_landlord_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- PASS 3: Acknowledgment columns on tenant links + view
-- =========================================================

ALTER TABLE public.agency_tenant_links
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS disputed_at timestamptz;

CREATE OR REPLACE VIEW public.pending_identity_links
WITH (security_barrier = true)
AS
SELECT
  'tenant'::text AS link_type,
  l.id AS link_id,
  l.user_id,
  l.agency_id,
  ha.name AS agency_name,
  l.status,
  l.source,
  l.created_at
FROM public.agency_tenant_links l
LEFT JOIN public.housing_authorities ha ON ha.id = l.agency_id
WHERE l.user_id = auth.uid()
  AND l.acknowledged_at IS NULL
  AND l.disputed_at IS NULL
UNION ALL
SELECT
  'landlord'::text AS link_type,
  l.id AS link_id,
  l.user_id,
  l.agency_id,
  ha.name AS agency_name,
  l.status,
  l.source,
  l.created_at
FROM public.agency_landlord_links l
LEFT JOIN public.housing_authorities ha ON ha.id = l.agency_id
WHERE l.user_id = auth.uid()
  AND l.acknowledged_at IS NULL
  AND l.disputed_at IS NULL;

GRANT SELECT ON public.pending_identity_links TO authenticated;

-- =========================================================
-- RPCs
-- =========================================================

-- Claim a pre-loaded landlord registration via token
CREATE OR REPLACE FUNCTION public.claim_landlord_registration(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.agency_landlords%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_row FROM public.agency_landlords
   WHERE claim_token = _token LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;

  IF v_row.claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;

  IF v_row.claim_token_expires_at IS NOT NULL AND v_row.claim_token_expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'token_expired');
  END IF;

  UPDATE public.agency_landlords
     SET landlord_user_id = v_uid,
         claimed_at = now(),
         claim_token = NULL,
         claim_token_expires_at = NULL,
         updated_at = now()
   WHERE id = v_row.id;

  INSERT INTO public.agency_landlord_links (user_id, agency_id, landlord_id, status, role, source)
  VALUES (v_uid, v_row.agency_id, v_row.id, 'active', 'owner', 'claimed')
  ON CONFLICT (user_id, agency_id, landlord_id) DO UPDATE
    SET status = 'active', updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'landlord_id', v_row.id,
    'agency_id', v_row.agency_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_landlord_registration(text) TO authenticated;

-- Claim a pre-loaded property via token
CREATE OR REPLACE FUNCTION public.claim_property(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_prop public.properties%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_prop FROM public.properties
   WHERE claim_token = _token LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_token');
  END IF;

  IF v_prop.claimed_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_claimed');
  END IF;

  IF v_prop.claim_token_expires_at IS NOT NULL AND v_prop.claim_token_expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'token_expired');
  END IF;

  UPDATE public.properties
     SET owner_id = v_uid,
         claimed_at = now(),
         claim_token = NULL,
         claim_token_expires_at = NULL,
         updated_at = now()
   WHERE id = v_prop.id;

  RETURN jsonb_build_object(
    'success', true,
    'property_id', v_prop.id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_property(text) TO authenticated;
