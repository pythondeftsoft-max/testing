
CREATE OR REPLACE FUNCTION public.get_content_by_slug_preview(slug_param text)
RETURNS SETOF public.content
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN
    RETURN QUERY SELECT * FROM public.content WHERE slug = slug_param LIMIT 1;
  ELSE
    RETURN QUERY SELECT * FROM public.content WHERE slug = slug_param AND status = 'published' LIMIT 1;
  END IF;
END;
$$;
