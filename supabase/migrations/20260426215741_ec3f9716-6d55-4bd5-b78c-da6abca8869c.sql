-- =====================================================
-- BLOCK 3: MFA Enforcement (additive, defaults OFF)
-- =====================================================

-- 1. user_mfa_settings: per-user MFA state
CREATE TABLE public.user_mfa_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  totp_factor_id TEXT,
  enrolled_at TIMESTAMPTZ,
  backup_codes_hash TEXT[],
  backup_codes_remaining INT NOT NULL DEFAULT 0,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_mfa_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own MFA settings"
  ON public.user_mfa_settings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own MFA settings"
  ON public.user_mfa_settings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own MFA settings"
  ON public.user_mfa_settings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own MFA settings"
  ON public.user_mfa_settings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all MFA settings"
  ON public.user_mfa_settings FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete any MFA settings"
  ON public.user_mfa_settings FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_user_mfa_settings_updated_at
  BEFORE UPDATE ON public.user_mfa_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. mfa_enforcement_config: per-role enforcement flags (all default off)
CREATE TABLE public.mfa_enforcement_config (
  role_name TEXT NOT NULL PRIMARY KEY,
  required BOOLEAN NOT NULL DEFAULT false,
  grace_period_days INT NOT NULL DEFAULT 14,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.mfa_enforcement_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read MFA enforcement config"
  ON public.mfa_enforcement_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify MFA enforcement config"
  ON public.mfa_enforcement_config FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Seed privileged roles, all required = false (opt-in)
INSERT INTO public.mfa_enforcement_config (role_name, required, notes) VALUES
  ('admin',                 false, 'OpenKey platform admin'),
  ('system_admin',          false, 'System-level administrator'),
  ('agency_admin',          false, 'PHA agency administrator'),
  ('agency_staff',          false, 'PHA agency staff member'),
  ('caseworker',            false, 'PHA caseworker'),
  ('caseworker_supervisor', false, 'PHA caseworker supervisor'),
  ('inspector',             false, 'Housing inspector')
ON CONFLICT (role_name) DO NOTHING;

-- 3. Helper function: does this user require MFA right now?
-- Returns true only if user has a privileged role AND that role's flag is true.
CREATE OR REPLACE FUNCTION public.user_requires_mfa(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.mfa_enforcement_config cfg
      ON cfg.role_name = ur.role::text
    WHERE ur.user_id = _user_id
      AND cfg.required = true
  );
$$;

-- Convenience function: is the current user enrolled in MFA?
CREATE OR REPLACE FUNCTION public.user_has_mfa(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_mfa_settings
    WHERE user_id = _user_id
      AND enrolled_at IS NOT NULL
  );
$$;