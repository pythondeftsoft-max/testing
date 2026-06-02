
-- 1) Enums for asset-level invites and billing

DO $$ BEGIN
  CREATE TYPE public.asset_invitee_type AS ENUM ('tenant', 'landlord', 'property_manager', 'investor', 'viewer', 'vendor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.asset_role_type AS ENUM ('manager', 'editor', 'viewer', 'billing_only');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.asset_charge_cadence AS ENUM ('monthly', 'weekly', 'quarterly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.asset_charge_type AS ENUM ('rent', 'slip_fee', 'mooring_fee', 'storage_fee', 'maintenance_fee', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- 2) Simple timestamp trigger helper used by new tables

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- 3) Asset-level memberships (who can access an individual asset)

CREATE TABLE IF NOT EXISTS public.portfolio_asset_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.portfolio_assets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL, -- references auth.users(id) (do not FK due to RLS exposure rules)
  role asset_role_type NOT NULL DEFAULT 'viewer',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, user_id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_update_portfolio_asset_memberships_updated_at ON public.portfolio_asset_memberships;
CREATE TRIGGER trg_update_portfolio_asset_memberships_updated_at
  BEFORE UPDATE ON public.portfolio_asset_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.portfolio_asset_memberships ENABLE ROW LEVEL SECURITY;

-- Policies:
-- Portfolio admins/editors for the asset's parent portfolio can manage memberships
CREATE POLICY "Portfolio admins/editors can manage asset memberships"
ON public.portfolio_asset_memberships
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.portfolio_assets pa
    WHERE pa.id = portfolio_asset_memberships.asset_id
      AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.portfolio_assets pa
    WHERE pa.id = portfolio_asset_memberships.asset_id
      AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  )
);

-- Members can view their own membership
CREATE POLICY "Users can view their own asset memberships"
ON public.portfolio_asset_memberships
FOR SELECT
USING (user_id = auth.uid());


-- 4) Asset-level invitations

CREATE TABLE IF NOT EXISTS public.portfolio_asset_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.portfolio_assets(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL,
  invited_user_id uuid NULL,
  invited_email text NOT NULL,
  invitee_type asset_invitee_type NOT NULL,
  role asset_role_type NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- pending | accepted | declined | expired
  invitation_token text NOT NULL DEFAULT public.generate_invitation_token(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz NULL,
  declined_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_asset_invitations_token_unique
ON public.portfolio_asset_invitations (invitation_token);

CREATE INDEX IF NOT EXISTS idx_asset_invitations_asset_id
ON public.portfolio_asset_invitations (asset_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_update_portfolio_asset_invitations_updated_at ON public.portfolio_asset_invitations;
CREATE TRIGGER trg_update_portfolio_asset_invitations_updated_at
  BEFORE UPDATE ON public.portfolio_asset_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.portfolio_asset_invitations ENABLE ROW LEVEL SECURITY;

-- Portfolio admins/editors for the parent portfolio can manage invitations
CREATE POLICY "Portfolio admins/editors can manage asset invitations"
ON public.portfolio_asset_invitations
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.portfolio_assets pa
    WHERE pa.id = portfolio_asset_invitations.asset_id
      AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.portfolio_assets pa
    WHERE pa.id = portfolio_asset_invitations.asset_id
      AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  )
);

-- Invited user can view their invitation by email (if logged in)
-- Note: relies on helper get_user_email(auth.uid()) used elsewhere in project
CREATE POLICY "Invited users can view their asset invitations by email"
ON public.portfolio_asset_invitations
FOR SELECT
USING (invited_email = get_user_email(auth.uid()));


-- 5) Asset recurring charges (optional fee schedule added during invite)
--    Draft charges created at invite-time can be tied to the invitation and activated upon acceptance.

CREATE TABLE IF NOT EXISTS public.asset_recurring_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES public.portfolio_assets(id) ON DELETE CASCADE,
  invite_id uuid NULL REFERENCES public.portfolio_asset_invitations(id) ON DELETE SET NULL,
  payer_user_id uuid NULL, -- Set when invite is accepted (for tenants or whoever pays)
  charge_type asset_charge_type NOT NULL,
  amount numeric NOT NULL,
  currency_code text NOT NULL DEFAULT 'USD',
  cadence asset_charge_cadence NOT NULL DEFAULT 'monthly',
  due_day integer NOT NULL DEFAULT 1, -- 1..28 recommended to avoid short months
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NULL,
  is_active boolean NOT NULL DEFAULT true,
  notes text NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_due_day_range CHECK (due_day BETWEEN 1 AND 28)
);

CREATE INDEX IF NOT EXISTS idx_asset_recurring_charges_asset_id
ON public.asset_recurring_charges (asset_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_update_asset_recurring_charges_updated_at ON public.asset_recurring_charges;
CREATE TRIGGER trg_update_asset_recurring_charges_updated_at
  BEFORE UPDATE ON public.asset_recurring_charges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.asset_recurring_charges ENABLE ROW LEVEL SECURITY;

-- Portfolio admins/editors for the parent portfolio can manage charges
CREATE POLICY "Portfolio admins/editors can manage asset recurring charges"
ON public.asset_recurring_charges
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.portfolio_assets pa
    WHERE pa.id = asset_recurring_charges.asset_id
      AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.portfolio_assets pa
    WHERE pa.id = asset_recurring_charges.asset_id
      AND has_portfolio_role(pa.portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
  )
);

-- Payer can view their own charges
CREATE POLICY "Payer can view their asset recurring charges"
ON public.asset_recurring_charges
FOR SELECT
USING (payer_user_id = auth.uid());


-- 6) Acceptance function: claim invitation, grant membership, activate any draft charges

CREATE OR REPLACE FUNCTION public.accept_asset_invitation(p_invitation_token text, p_user_id uuid)
RETURNS TABLE(success boolean, message text, asset_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv record;
BEGIN
  -- Find a valid invitation
  SELECT *
  INTO v_inv
  FROM public.portfolio_asset_invitations
  WHERE invitation_token = p_invitation_token
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired invitation'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Mark invitation accepted and link user
  UPDATE public.portfolio_asset_invitations
  SET status = 'accepted',
      accepted_at = now(),
      invited_user_id = p_user_id,
      updated_at = now()
  WHERE id = v_inv.id;

  -- Create membership if not exists
  INSERT INTO public.portfolio_asset_memberships (asset_id, user_id, role, is_active, created_by)
  VALUES (v_inv.asset_id, p_user_id, v_inv.role, true, v_inv.inviter_id)
  ON CONFLICT (asset_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        is_active = true,
        updated_at = now();

  -- Activate any draft charges associated with this invitation
  UPDATE public.asset_recurring_charges
  SET payer_user_id = p_user_id,
      is_active = true,
      invite_id = NULL,
      updated_at = now()
  WHERE invite_id = v_inv.id;

  -- Notify inviter
  INSERT INTO public.notifications (
    user_id, title, description, type, link, created_at, updated_at
  ) VALUES (
    v_inv.inviter_id,
    'Invitation accepted',
    'Your invite to access the asset has been accepted.',
    'success',
    '/dashboard?assetId=' || v_inv.asset_id,
    now(),
    now()
  );

  RETURN QUERY SELECT TRUE, 'Invitation accepted successfully'::text, v_inv.asset_id;
END;
$$;


-- 7) Helper: allow asset members to view the asset (if not already covered elsewhere)
-- If you already gate portfolio_assets reading via portfolio-level roles only, you may want to extend policies
-- to allow asset-level members to view the specific asset. If policies already exist, adjust accordingly.

-- Example SELECT policy (only create if missing or to complement existing):
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'portfolio_assets'
      AND policyname = 'Asset members can view the asset'
  ) THEN
    CREATE POLICY "Asset members can view the asset"
    ON public.portfolio_assets
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.portfolio_asset_memberships pam
        WHERE pam.asset_id = portfolio_assets.id
          AND pam.user_id = auth.uid()
          AND pam.is_active = true
      )
    );
  END IF;
END $$;
