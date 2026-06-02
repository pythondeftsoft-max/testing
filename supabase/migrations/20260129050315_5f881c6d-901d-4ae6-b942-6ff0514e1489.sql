-- Add alt text column for featured images (SEO & accessibility)
ALTER TABLE public.blog_posts 
ADD COLUMN featured_image_alt text;