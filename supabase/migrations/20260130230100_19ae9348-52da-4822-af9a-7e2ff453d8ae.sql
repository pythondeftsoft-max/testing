-- Add scheduled_publish_at for staggered publishing
ALTER TABLE public.blog_posts 
ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient scheduling queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_scheduled_publish 
ON public.blog_posts(scheduled_publish_at) 
WHERE scheduled_publish_at IS NOT NULL AND status = 'scheduled';

-- Add comment for documentation
COMMENT ON COLUMN public.blog_posts.scheduled_publish_at IS 'Scheduled date/time for automatic publishing (for staggered translations)';