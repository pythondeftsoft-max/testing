-- Add language support to blog_posts
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES blog_posts(id) ON DELETE SET NULL;

-- Add index for language queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_language ON blog_posts(language);
CREATE INDEX IF NOT EXISTS idx_blog_posts_parent ON blog_posts(parent_post_id);

-- Drop existing unique constraint on slug if exists and add new one for slug+language
ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_slug_key;
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_slug_language_unique UNIQUE (slug, language);

-- Update generation_logs for n8n tracking
ALTER TABLE blog_generation_logs ADD COLUMN IF NOT EXISTS n8n_execution_id TEXT;
ALTER TABLE blog_generation_logs ADD COLUMN IF NOT EXISTS languages_generated TEXT[] DEFAULT ARRAY['en']::TEXT[];

-- Reset pillar counters to match reality (likely 0 posts currently)
UPDATE blog_pillars SET posts_count = (
  SELECT COUNT(*) FROM blog_posts WHERE blog_posts.pillar_id = blog_pillars.id AND language = 'en'
);

-- Add supported languages reference table
CREATE TABLE IF NOT EXISTS supported_languages (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 999,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert supported languages
INSERT INTO supported_languages (code, name, native_name, display_order) VALUES
  ('en', 'English', 'English', 1),
  ('es', 'Spanish', 'Español', 2),
  ('pt', 'Portuguese', 'Português', 3),
  ('zh', 'Chinese', '中文', 4),
  ('vi', 'Vietnamese', 'Tiếng Việt', 5),
  ('ko', 'Korean', '한국어', 6),
  ('hi', 'Hindi', 'हिन्दी', 7),
  ('ar', 'Arabic', 'العربية', 8),
  ('fr', 'French', 'Français', 9),
  ('de', 'German', 'Deutsch', 10),
  ('it', 'Italian', 'Italiano', 11),
  ('ja', 'Japanese', '日本語', 12),
  ('ru', 'Russian', 'Русский', 13)
ON CONFLICT (code) DO NOTHING;

-- RLS for supported_languages (public read)
ALTER TABLE supported_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view supported languages"
  ON supported_languages FOR SELECT
  USING (true);