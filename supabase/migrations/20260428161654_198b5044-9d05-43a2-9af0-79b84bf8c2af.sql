-- Prospect status enum
CREATE TYPE public.prospect_status AS ENUM (
  'cold','researching','contacted','demo_scheduled','negotiating','customer','not_a_fit','dormant'
);

-- One row per PHA being worked
CREATE TABLE public.pha_prospect_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  housing_authority_id UUID NOT NULL UNIQUE REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  status public.prospect_status NOT NULL DEFAULT 'cold',
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  next_action_at TIMESTAMPTZ,
  last_contacted_at TIMESTAMPTZ,
  fit_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pha_prospect_status_status ON public.pha_prospect_status(status);
CREATE INDEX idx_pha_prospect_status_owner ON public.pha_prospect_status(owner_user_id);

ALTER TABLE public.pha_prospect_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage prospect status"
ON public.pha_prospect_status
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER trg_pha_prospect_status_updated_at
BEFORE UPDATE ON public.pha_prospect_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Notes timeline
CREATE TABLE public.pha_prospect_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES public.pha_prospect_status(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'other' CHECK (kind IN ('call','email','meeting','research','other')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pha_prospect_notes_prospect ON public.pha_prospect_notes(prospect_id, created_at DESC);

ALTER TABLE public.pha_prospect_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage prospect notes"
ON public.pha_prospect_notes
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));