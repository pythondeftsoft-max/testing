
-- seo_location_queue table for geographic targeting
CREATE TABLE public.seo_location_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL,
  city text,
  zipcode text,
  page_type text NOT NULL,
  priority integer NOT NULL DEFAULT 5,
  status text NOT NULL DEFAULT 'pending',
  published_content_id uuid REFERENCES public.content(id),
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS: service role only (agent runs as service role)
ALTER TABLE public.seo_location_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on seo_location_queue"
  ON public.seo_location_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin read access
CREATE POLICY "Admins can view seo_location_queue"
  ON public.seo_location_queue
  FOR SELECT
  TO authenticated
  USING (true);

-- Index for agent queries
CREATE INDEX idx_seo_location_queue_status_priority 
  ON public.seo_location_queue(status, priority ASC);

-- Updated_at trigger
CREATE TRIGGER update_seo_location_queue_updated_at
  BEFORE UPDATE ON public.seo_location_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
