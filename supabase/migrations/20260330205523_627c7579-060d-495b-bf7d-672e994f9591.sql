
-- Scout Leads staging table
CREATE TABLE public.scout_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  street_address TEXT,
  city TEXT,
  state TEXT,
  bedrooms INTEGER,
  rent NUMERIC,
  source_url TEXT,
  listing_title TEXT,
  search_query TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

ALTER TABLE public.scout_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scout_leads"
  ON public.scout_leads
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Agent Reports table
CREATE TABLE public.agent_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  report_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read agent_reports"
  ON public.agent_reports
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Service can insert agent_reports"
  ON public.agent_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
