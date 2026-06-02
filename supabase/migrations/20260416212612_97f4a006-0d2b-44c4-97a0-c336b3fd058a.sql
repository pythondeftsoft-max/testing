-- Phase B: Add UTM/source attribution + demo video to leads
ALTER TABLE public.agency_leads
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS referrer_url text,
  ADD COLUMN IF NOT EXISTS landing_page text,
  ADD COLUMN IF NOT EXISTS demo_video_url text,
  ADD COLUMN IF NOT EXISTS proposal_pdf_url text,
  ADD COLUMN IF NOT EXISTS proposal_amount numeric,
  ADD COLUMN IF NOT EXISTS proposal_sent_at timestamptz;

-- Phase C: Welcome email sequence tracking
CREATE TABLE IF NOT EXISTS public.agency_welcome_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.housing_authorities(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  sequence_step int NOT NULL,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, sequence_step)
);

ALTER TABLE public.agency_welcome_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage welcome emails"
  ON public.agency_welcome_emails FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_agency_welcome_emails_pending
  ON public.agency_welcome_emails (scheduled_for)
  WHERE status = 'pending';

-- Phase C: Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES public.housing_authorities(id) ON DELETE SET NULL,
  submitted_by uuid,
  submitter_email text NOT NULL,
  submitter_name text,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal',
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  assigned_to uuid,
  resolution_notes text,
  resolved_at timestamptz,
  page_url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all tickets"
  ON public.support_tickets FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users see their own tickets"
  ON public.support_tickets FOR SELECT
  USING (submitted_by = auth.uid());

CREATE POLICY "Authenticated users create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND submitted_by = auth.uid());

CREATE POLICY "Agency staff see agency tickets"
  ON public.support_tickets FOR SELECT
  USING (agency_id IS NOT NULL AND is_agency_staff(auth.uid(), agency_id));

CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_agency ON public.support_tickets (agency_id, status);

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agency_welcome_emails_updated_at
  BEFORE UPDATE ON public.agency_welcome_emails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();