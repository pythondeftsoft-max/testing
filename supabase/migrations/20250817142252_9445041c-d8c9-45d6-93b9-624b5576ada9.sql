-- Fix duplicate investment categories by consolidating them
-- First, update any existing assets using the legacy 'investment' category to use 'investments'
UPDATE portfolio_assets 
SET asset_category_id = (
  SELECT id FROM asset_categories WHERE name = 'investments' AND is_active = true
)
WHERE asset_category_id = (
  SELECT id FROM asset_categories WHERE name = 'investment' AND is_active = true
);

-- Update the legacy category to be clearly distinguished and deactivated
UPDATE asset_categories 
SET 
  display_name = 'Investments (Legacy)',
  is_active = false,
  description = 'Legacy investment category - use "Investments" for new assets'
WHERE name = 'investment' AND is_active = true;

-- Ensure the new investments category has proper subcategories
UPDATE asset_categories 
SET subcategories = '[
  {"value": "stocks", "label": "Stocks"},
  {"value": "bonds", "label": "Bonds"},
  {"value": "etfs", "label": "ETFs"},
  {"value": "mutual_funds", "label": "Mutual Funds"},
  {"value": "crypto", "label": "Cryptocurrency"},
  {"value": "commodities", "label": "Commodities"},
  {"value": "options", "label": "Options"},
  {"value": "forex", "label": "Forex"},
  {"value": "derivatives", "label": "Derivatives"},
  {"value": "other", "label": "Other"}
]'::jsonb
WHERE name = 'investments' AND is_active = true;