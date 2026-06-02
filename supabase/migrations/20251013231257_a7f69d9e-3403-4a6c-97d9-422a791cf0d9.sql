-- Remove DeFi Token and NFT subcategories from crypto asset category
UPDATE asset_categories
SET subcategories = '[
  {"label": "Bitcoin", "value": "bitcoin"},
  {"label": "Ethereum", "value": "ethereum"},
  {"label": "Altcoin", "value": "altcoin"},
  {"label": "Stablecoin", "value": "stablecoin"}
]'::jsonb,
updated_at = NOW()
WHERE name = 'crypto';