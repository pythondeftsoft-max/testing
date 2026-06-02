-- Create table for tracking link clicks in blog posts
CREATE TABLE public.blog_link_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  link_url TEXT NOT NULL,
  link_text TEXT,
  session_id TEXT,
  user_agent TEXT,
  referrer TEXT,
  clicked_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_link_clicks ENABLE ROW LEVEL SECURITY;

-- Allow inserts from anyone (public tracking endpoint)
CREATE POLICY "Allow public inserts for link tracking"
ON public.blog_link_clicks
FOR INSERT
WITH CHECK (true);

-- Allow reads for authenticated admins (owner, admin_partner, editor roles)
CREATE POLICY "Allow admin reads for analytics"
ON public.blog_link_clicks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE user_id = auth.uid()
    AND role_name IN ('owner', 'admin_partner', 'editor')
    AND is_active = true
  )
);

-- Create indexes for efficient querying
CREATE INDEX idx_blog_link_clicks_post_id ON public.blog_link_clicks(post_id);
CREATE INDEX idx_blog_link_clicks_link_url ON public.blog_link_clicks(link_url);
CREATE INDEX idx_blog_link_clicks_clicked_at ON public.blog_link_clicks(clicked_at);
CREATE INDEX idx_blog_link_clicks_session_id ON public.blog_link_clicks(session_id);