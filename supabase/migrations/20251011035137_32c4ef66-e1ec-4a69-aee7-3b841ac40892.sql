-- Remove "Classic Cars" from Alternative Investments subcategories
-- Classic cars are already covered under "Vehicles & Equipment" category
UPDATE asset_categories 
SET subcategories = '[
  {"label": "Art & Collectibles", "value": "art"},
  {"label": "Wine", "value": "wine"},
  {"label": "Watches & Jewelry", "value": "watches"},
  {"label": "Sports Memorabilia", "value": "sports_memorabilia"},
  {"label": "Antiques", "value": "antiques"},
  {"label": "Memorabilia", "value": "memorabilia"},
  {"label": "Intellectual Property", "value": "intellectual_property"}
]'::jsonb,
updated_at = now()
WHERE name = 'alternatives';