
-- Update asset categories with comprehensive subcategories
UPDATE asset_categories 
SET subcategories = '[
  {"value": "cryptocurrency", "label": "Cryptocurrency"},
  {"value": "stocks", "label": "Stocks & ETFs"},
  {"value": "bonds", "label": "Bonds"},
  {"value": "mutual_funds", "label": "Mutual Funds"},
  {"value": "reits", "label": "REITs"},
  {"value": "commodities", "label": "Commodities"},
  {"value": "derivatives", "label": "Derivatives"},
  {"value": "fixed_income", "label": "CDs & Fixed Income"},
  {"value": "cash_equivalents", "label": "Cash Equivalents"}
]'::jsonb
WHERE name = 'investments';

UPDATE asset_categories 
SET subcategories = '[
  {"value": "residential_property", "label": "Residential Property"},
  {"value": "commercial_property", "label": "Commercial Property"},
  {"value": "land", "label": "Land & Development"},
  {"value": "real_estate_crowdfunding", "label": "Real Estate Crowdfunding"}
]'::jsonb
WHERE name = 'real_estate';

UPDATE asset_categories 
SET subcategories = '[
  {"value": "private_equity", "label": "Private Equity"},
  {"value": "franchises", "label": "Franchises"},
  {"value": "intellectual_property", "label": "Intellectual Property"},
  {"value": "business_ownership", "label": "Business Ownership"},
  {"value": "restaurant_business", "label": "Restaurant Business"},
  {"value": "hospitality_business", "label": "Hospitality Business"}
]'::jsonb
WHERE name = 'business_holding';

UPDATE asset_categories 
SET subcategories = '[
  {"value": "vehicles", "label": "Vehicles"},
  {"value": "equipment", "label": "Equipment"},
  {"value": "machinery", "label": "Machinery"}
]'::jsonb
WHERE name = 'vehicle';

UPDATE asset_categories 
SET subcategories = '[
  {"value": "art", "label": "Art"},
  {"value": "collectibles", "label": "Collectibles"},
  {"value": "antiques", "label": "Antiques"},
  {"value": "memorabilia", "label": "Memorabilia"}
]'::jsonb
WHERE name = 'other';

-- Update the 'other' category display name and add more subcategories
UPDATE asset_categories 
SET 
  display_name = 'Other Assets',
  subcategories = '[
    {"value": "insurance_policies", "label": "Insurance Policies"},
    {"value": "precious_metals", "label": "Precious Metals"},
    {"value": "other", "label": "Other"}
  ]'::jsonb
WHERE name = 'other' AND display_name != 'Collectibles & Art';

-- If there's a separate collectibles category, update it
UPDATE asset_categories 
SET subcategories = '[
  {"value": "art", "label": "Art"},
  {"value": "collectibles", "label": "Collectibles"},
  {"value": "antiques", "label": "Antiques"},
  {"value": "memorabilia", "label": "Memorabilia"}
]'::jsonb
WHERE display_name = 'Collectibles & Art';
