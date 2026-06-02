-- Merge Collectibles & Art into Alternative Investments

-- Step 1: Update the alternatives category with comprehensive subcategories
UPDATE asset_categories 
SET subcategories = '[
  {"value": "art", "label": "Art & Collectibles"},
  {"value": "wine", "label": "Wine"},
  {"value": "classic_cars", "label": "Classic Cars"},
  {"value": "watches", "label": "Watches & Jewelry"},
  {"value": "sports_memorabilia", "label": "Sports Memorabilia"},
  {"value": "antiques", "label": "Antiques"},
  {"value": "memorabilia", "label": "Memorabilia"},
  {"value": "intellectual_property", "label": "Intellectual Property"}
]'::jsonb,
description = 'Art, collectibles, antiques, and other alternative assets',
updated_at = now()
WHERE name = 'alternatives';

-- Step 2: Deactivate the collectible category (hides it from UI)
UPDATE asset_categories 
SET is_active = false,
    updated_at = now()
WHERE name = 'collectible';