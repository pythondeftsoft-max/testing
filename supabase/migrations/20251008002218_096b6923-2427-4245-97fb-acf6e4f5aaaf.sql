-- Deactivate the broad "investments" category as it overlaps with specific categories
-- This keeps historical data intact but removes it from user-facing selections
UPDATE asset_categories 
SET is_active = false, 
    updated_at = now()
WHERE name = 'investments';

-- Migrate any existing assets from "investments" to appropriate specific categories
-- First, let's check and migrate stocks/equities-type investments
UPDATE portfolio_assets
SET asset_category_id = (
  SELECT id FROM asset_categories WHERE name = 'stocks_equities' LIMIT 1
),
updated_at = now()
WHERE asset_category_id = (SELECT id FROM asset_categories WHERE name = 'investments')
AND (
  metadata->>'asset_type' IN ('stock', 'etf', 'mutual_fund', 'equity')
  OR metadata->>'symbol' IS NOT NULL
);

-- Migrate crypto-type investments
UPDATE portfolio_assets
SET asset_category_id = (
  SELECT id FROM asset_categories WHERE name = 'cryptocurrency' LIMIT 1
),
updated_at = now()
WHERE asset_category_id = (SELECT id FROM asset_categories WHERE name = 'investments')
AND metadata->>'asset_type' IN ('crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'altcoin');

-- Migrate bond-type investments
UPDATE portfolio_assets
SET asset_category_id = (
  SELECT id FROM asset_categories WHERE name = 'bonds_fixed_income' LIMIT 1
),
updated_at = now()
WHERE asset_category_id = (SELECT id FROM asset_categories WHERE name = 'investments')
AND metadata->>'asset_type' IN ('bond', 'fixed_income', 'treasury', 'cd');

-- Migrate remaining generic investments to stocks_equities as default
UPDATE portfolio_assets
SET asset_category_id = (
  SELECT id FROM asset_categories WHERE name = 'stocks_equities' LIMIT 1
),
updated_at = now()
WHERE asset_category_id = (SELECT id FROM asset_categories WHERE name = 'investments');