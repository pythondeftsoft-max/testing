-- Migrate 8 blog posts into unified content table (idempotent)
INSERT INTO content (
  content_type, template, title, slug, body, excerpt,
  meta_title, meta_description, seo_keywords,
  featured_image, featured_image_alt,
  status, language, parent_post_id, pillar_id,
  content_structure, meta_tags, view_count,
  publish_date, scheduled_publish_at,
  state, city, created_at, updated_at, created_by
)
SELECT
  'blog_post', 'blog', bp.title, bp.slug, bp.content, bp.excerpt,
  bp.seo_title, bp.seo_description, bp.seo_keywords,
  bp.featured_image_url, bp.featured_image_alt,
  bp.status, bp.language, bp.parent_post_id, bp.pillar_id,
  bp.content_structure, bp.meta_tags, bp.view_count,
  bp.published_at, bp.scheduled_publish_at,
  bp.location_state, bp.location_city, bp.created_at, bp.updated_at, bp.author_id
FROM blog_posts bp
WHERE bp.slug NOT IN (SELECT slug FROM content);