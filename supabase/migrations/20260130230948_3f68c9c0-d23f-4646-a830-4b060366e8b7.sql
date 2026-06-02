-- Clean up orphaned translation posts that have no English parent
-- These were created by a bug in n8n-blog-callback
DELETE FROM blog_posts 
WHERE slug LIKE 'section-8-landlord-guide-2026-%'
  AND language != 'en'
  AND parent_post_id IS NULL;