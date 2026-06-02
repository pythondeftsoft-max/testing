-- One-time sync of posts_count to actual values
UPDATE blog_pillars bp
SET posts_count = COALESCE((SELECT COUNT(*) FROM blog_posts WHERE pillar_id = bp.id AND status = 'published'), 0);

-- Create trigger function to keep posts_count synced
CREATE OR REPLACE FUNCTION update_pillar_posts_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'published' THEN
      UPDATE blog_pillars SET posts_count = posts_count + 1 WHERE id = NEW.pillar_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.status = 'published' AND OLD.pillar_id IS NOT NULL THEN
      UPDATE blog_pillars SET posts_count = GREATEST(0, posts_count - 1) WHERE id = OLD.pillar_id;
    END IF;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes or pillar changes
    IF OLD.pillar_id IS DISTINCT FROM NEW.pillar_id OR OLD.status IS DISTINCT FROM NEW.status THEN
      -- Decrement old pillar if was published
      IF OLD.status = 'published' AND OLD.pillar_id IS NOT NULL THEN
        UPDATE blog_pillars SET posts_count = GREATEST(0, posts_count - 1) WHERE id = OLD.pillar_id;
      END IF;
      -- Increment new pillar if now published
      IF NEW.status = 'published' AND NEW.pillar_id IS NOT NULL THEN
        UPDATE blog_pillars SET posts_count = posts_count + 1 WHERE id = NEW.pillar_id;
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_pillar_posts_count ON blog_posts;
CREATE TRIGGER trigger_update_pillar_posts_count
AFTER INSERT OR UPDATE OR DELETE ON blog_posts
FOR EACH ROW EXECUTE FUNCTION update_pillar_posts_count();