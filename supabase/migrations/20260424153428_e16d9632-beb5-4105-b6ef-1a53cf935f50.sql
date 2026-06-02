
-- ============= Auto-Pusher Settings (singleton) =============
CREATE TABLE IF NOT EXISTS public.auto_pusher_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  singleton BOOLEAN NOT NULL DEFAULT true UNIQUE,
  master_enabled BOOLEAN NOT NULL DEFAULT false,
  mode TEXT NOT NULL DEFAULT 'suggest_only' CHECK (mode IN ('suggest_only', 'auto_hot', 'auto_hot_decent')),
  score_floor INTEGER NOT NULL DEFAULT 80 CHECK (score_floor BETWEEN 0 AND 100),
  daily_cap_total INTEGER NOT NULL DEFAULT 50,
  daily_cap_per_tenant INTEGER NOT NULL DEFAULT 2,
  cooldown_days INTEGER NOT NULL DEFAULT 14,
  quiet_hours_start INTEGER NOT NULL DEFAULT 21 CHECK (quiet_hours_start BETWEEN 0 AND 23),
  quiet_hours_end INTEGER NOT NULL DEFAULT 8 CHECK (quiet_hours_end BETWEEN 0 AND 23),
  sms_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  dry_run BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.auto_pusher_settings (singleton)
VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

ALTER TABLE public.auto_pusher_settings ENABLE ROW LEVEL SECURITY;

-- ============= Auto-Pusher Territory Allow-List =============
CREATE TABLE IF NOT EXISTS public.auto_pusher_territories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  state TEXT,
  city TEXT,
  housing_authority_id UUID,
  label TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (state IS NOT NULL OR city IS NOT NULL OR housing_authority_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_auto_pusher_territories_state ON public.auto_pusher_territories(state) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_auto_pusher_territories_city ON public.auto_pusher_territories(city) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_auto_pusher_territories_pha ON public.auto_pusher_territories(housing_authority_id) WHERE enabled = true;

ALTER TABLE public.auto_pusher_territories ENABLE ROW LEVEL SECURITY;

-- ============= Suggested Pushes Queue =============
CREATE TABLE IF NOT EXISTS public.suggested_pushes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  unit_id UUID,
  property_id UUID,
  score INTEGER NOT NULL,
  tier TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','sent','expired')),
  reasoning JSONB,
  source_match_id UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  push_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suggested_pushes_status ON public.suggested_pushes(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggested_pushes_tenant ON public.suggested_pushes(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggested_pushes_unit ON public.suggested_pushes(unit_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_suggested_pushes_pending
  ON public.suggested_pushes(tenant_id, unit_id)
  WHERE status = 'pending';

ALTER TABLE public.suggested_pushes ENABLE ROW LEVEL SECURITY;

-- ============= RLS helper =============
CREATE OR REPLACE FUNCTION public.is_matchmaker_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.system_admins
    WHERE user_id = _user_id
      AND is_active = true
      AND role_name IN ('super_admin', 'operations_admin', 'matchmaker')
  );
$$;

-- ============= Policies =============
DROP POLICY IF EXISTS "Matchmaker admins can view auto-pusher settings" ON public.auto_pusher_settings;
CREATE POLICY "Matchmaker admins can view auto-pusher settings"
ON public.auto_pusher_settings FOR SELECT
USING (public.is_matchmaker_admin(auth.uid()));

DROP POLICY IF EXISTS "Matchmaker admins can update auto-pusher settings" ON public.auto_pusher_settings;
CREATE POLICY "Matchmaker admins can update auto-pusher settings"
ON public.auto_pusher_settings FOR UPDATE
USING (public.is_matchmaker_admin(auth.uid()));

DROP POLICY IF EXISTS "Matchmaker admins can view territories" ON public.auto_pusher_territories;
CREATE POLICY "Matchmaker admins can view territories"
ON public.auto_pusher_territories FOR SELECT
USING (public.is_matchmaker_admin(auth.uid()));

DROP POLICY IF EXISTS "Matchmaker admins can insert territories" ON public.auto_pusher_territories;
CREATE POLICY "Matchmaker admins can insert territories"
ON public.auto_pusher_territories FOR INSERT
WITH CHECK (public.is_matchmaker_admin(auth.uid()));

DROP POLICY IF EXISTS "Matchmaker admins can update territories" ON public.auto_pusher_territories;
CREATE POLICY "Matchmaker admins can update territories"
ON public.auto_pusher_territories FOR UPDATE
USING (public.is_matchmaker_admin(auth.uid()));

DROP POLICY IF EXISTS "Matchmaker admins can delete territories" ON public.auto_pusher_territories;
CREATE POLICY "Matchmaker admins can delete territories"
ON public.auto_pusher_territories FOR DELETE
USING (public.is_matchmaker_admin(auth.uid()));

DROP POLICY IF EXISTS "Matchmaker admins can view suggested pushes" ON public.suggested_pushes;
CREATE POLICY "Matchmaker admins can view suggested pushes"
ON public.suggested_pushes FOR SELECT
USING (public.is_matchmaker_admin(auth.uid()));

DROP POLICY IF EXISTS "Matchmaker admins can update suggested pushes" ON public.suggested_pushes;
CREATE POLICY "Matchmaker admins can update suggested pushes"
ON public.suggested_pushes FOR UPDATE
USING (public.is_matchmaker_admin(auth.uid()));

-- ============= updated_at triggers =============
DROP TRIGGER IF EXISTS update_auto_pusher_settings_updated_at ON public.auto_pusher_settings;
CREATE TRIGGER update_auto_pusher_settings_updated_at
  BEFORE UPDATE ON public.auto_pusher_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_suggested_pushes_updated_at ON public.suggested_pushes;
CREATE TRIGGER update_suggested_pushes_updated_at
  BEFORE UPDATE ON public.suggested_pushes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
