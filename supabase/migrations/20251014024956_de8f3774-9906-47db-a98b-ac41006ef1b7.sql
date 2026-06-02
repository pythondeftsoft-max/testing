-- Deactivate the real_estate category from portfolio assets
-- This removes it from the asset wizard while preserving existing data
UPDATE asset_categories 
SET is_active = false, 
    updated_at = now()
WHERE name = 'real_estate';