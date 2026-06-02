-- Update commodities subcategories: Remove livestock, add soft commodities and rare earth elements
UPDATE asset_categories 
SET subcategories = '[
  {"value": "precious_metals", "label": "Precious Metals"},
  {"value": "energy", "label": "Energy Commodities"},
  {"value": "agriculture", "label": "Agricultural Commodities"},
  {"value": "industrial_metals", "label": "Industrial Metals"},
  {"value": "soft_commodities", "label": "Soft Commodities"},
  {"value": "rare_earth_elements", "label": "Rare Earth Elements"}
]'::jsonb,
updated_at = now()
WHERE name = 'commodities';