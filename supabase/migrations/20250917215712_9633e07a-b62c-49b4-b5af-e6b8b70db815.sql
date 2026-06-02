-- Update crypto category to use Bitcoin icon
UPDATE asset_categories 
SET icon_name = 'Bitcoin' 
WHERE name = 'crypto';