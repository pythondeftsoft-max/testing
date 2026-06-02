-- 1. Enum for platform-level policy
DO $$ BEGIN
  CREATE TYPE public.dual_approval_platform_mode AS ENUM ('agency_choice', 'force_on', 'force_off');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Add columns to housing_authorities
ALTER TABLE public.housing_authorities
  ADD COLUMN IF NOT EXISTS dual_approval_platform_mode public.dual_approval_platform_mode NOT NULL DEFAULT 'agency_choice',
  ADD COLUMN IF NOT EXISTS dual_approval_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dual_approval_threshold_amount numeric NOT NULL DEFAULT 0;

-- 3. Add columns to hap_payment_batches for co-sign tracking
ALTER TABLE public.hap_payment_batches
  ADD COLUMN IF NOT EXISTS second_approver_id uuid,
  ADD COLUMN IF NOT EXISTS second_approved_at timestamptz;

-- 4. Helper: encapsulates override logic in one place
CREATE OR REPLACE FUNCTION public.requires_dual_approval(_agency_id uuid, _batch_amount numeric)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN ha.dual_approval_platform_mode = 'force_on' THEN
      _batch_amount >= COALESCE(ha.dual_approval_threshold_amount, 0)
    WHEN ha.dual_approval_platform_mode = 'force_off' THEN
      false
    ELSE -- agency_choice
      ha.dual_approval_enabled
        AND _batch_amount >= COALESCE(ha.dual_approval_threshold_amount, 0)
  END
  FROM public.housing_authorities ha
  WHERE ha.id = _agency_id
$$;

-- 5. Allow platform admins to update the platform mode (agency staff cannot)
-- We rely on the existing UPDATE policy for agency-controlled fields.
-- Add a guard trigger to prevent non-admins from changing the platform mode.
CREATE OR REPLACE FUNCTION public.guard_dual_approval_platform_mode()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.dual_approval_platform_mode IS DISTINCT FROM OLD.dual_approval_platform_mode THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Only platform administrators can change dual approval platform policy';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_dual_approval_platform_mode ON public.housing_authorities;
CREATE TRIGGER trg_guard_dual_approval_platform_mode
  BEFORE UPDATE ON public.housing_authorities
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_dual_approval_platform_mode();