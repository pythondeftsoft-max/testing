-- Move insurance/annuities to Bonds & Fixed Income category
-- Add new subcategories for insurance products
UPDATE asset_categories
SET 
  subcategories = jsonb_build_array(
    jsonb_build_object('value', 'government_bond', 'label', 'Government Bond'),
    jsonb_build_object('value', 'corporate_bond', 'label', 'Corporate Bond'),
    jsonb_build_object('value', 'municipal_bond', 'label', 'Municipal Bond'),
    jsonb_build_object('value', 'treasury', 'label', 'Treasury Securities'),
    jsonb_build_object('value', 'cd', 'label', 'Certificate of Deposit (CD)'),
    jsonb_build_object('value', 'annuity', 'label', 'Annuity'),
    jsonb_build_object('value', 'life_insurance', 'label', 'Cash Value Life Insurance'),
    jsonb_build_object('value', 'other_fixed_income', 'label', 'Other Fixed Income')
  ),
  updated_at = now()
WHERE name = 'bonds_fixed_income';

-- Deactivate "Other Assets" category since all its types are now in proper categories
UPDATE asset_categories
SET 
  is_active = false,
  updated_at = now()
WHERE name = 'other';

-- Migrate any existing "other" assets with precious_metals subcategory to commodities
UPDATE portfolio_assets
SET 
  asset_category_id = (SELECT id FROM asset_categories WHERE name = 'commodities'),
  metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{commodity_type}',
    '"precious_metals"'::jsonb
  ),
  updated_at = now()
WHERE asset_category_id = (SELECT id FROM asset_categories WHERE name = 'other')
  AND metadata->>'subcategory' = 'precious_metals';

-- Comment for tracking
COMMENT ON COLUMN asset_categories.subcategories IS 'Insurance products (annuities, life insurance) moved to bonds_fixed_income category';