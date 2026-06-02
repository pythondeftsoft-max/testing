CREATE OR REPLACE FUNCTION public.increment_blog_view_count(post_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.blog_posts
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = post_id
    AND status = 'published';
END;
$$;