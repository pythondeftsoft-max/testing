-- Drop the old version of get_unified_activity_feed function
-- This removes the version with p_limit and p_offset parameters
DROP FUNCTION IF EXISTS get_unified_activity_feed(
  INTEGER,
  INTEGER,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT
);