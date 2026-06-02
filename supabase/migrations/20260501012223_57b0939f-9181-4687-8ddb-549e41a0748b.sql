-- 1. Extend agency_contracts (additive)
ALTER TABLE public.agency_contracts
  ADD COLUMN IF NOT EXISTS source_lead_id uuid REFERENCES public.agency_leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_prospect_id uuid REFERENCES public.pha_prospect_status(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_tier text,
  ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS term_months integer,
  ADD COLUMN IF NOT EXISTS signed_pdf_url text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS go_live_date date,
  ADD COLUMN IF NOT EXISTS onboarding_owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- 2. Contract addendum table
CREATE TABLE IF NOT EXISTS public.agency_contract_addendum (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.agency_contracts(id) ON DELETE CASCADE,
  modules_included jsonb NOT NULL DEFAULT '[]'::jsonb,
  integrations jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_migration_scope text,
  training_package text,
  custom_terms text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contract_id)
);

ALTER TABLE public.agency_contract_addendum ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage contract addenda" ON public.agency_contract_addendum;
CREATE POLICY "Admins manage contract addenda"
  ON public.agency_contract_addendum
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_addendum_updated_at ON public.agency_contract_addendum;
CREATE TRIGGER trg_addendum_updated_at
  BEFORE UPDATE ON public.agency_contract_addendum
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Extend agency_lead_status enum (additive)
ALTER TYPE public.agency_lead_status ADD VALUE IF NOT EXISTS 'negotiation';
ALTER TYPE public.agency_lead_status ADD VALUE IF NOT EXISTS 'agreement';
ALTER TYPE public.agency_lead_status ADD VALUE IF NOT EXISTS 'onboarding';
ALTER TYPE public.agency_lead_status ADD VALUE IF NOT EXISTS 'live';

-- 4. Storage bucket for signed agreements (private, admin-only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('signed-agreements', 'signed-agreements', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins read signed agreements" ON storage.objects;
CREATE POLICY "Admins read signed agreements"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'signed-agreements' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins upload signed agreements" ON storage.objects;
CREATE POLICY "Admins upload signed agreements"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'signed-agreements' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins update signed agreements" ON storage.objects;
CREATE POLICY "Admins update signed agreements"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'signed-agreements' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins delete signed agreements" ON storage.objects;
CREATE POLICY "Admins delete signed agreements"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'signed-agreements' AND public.is_admin(auth.uid()));