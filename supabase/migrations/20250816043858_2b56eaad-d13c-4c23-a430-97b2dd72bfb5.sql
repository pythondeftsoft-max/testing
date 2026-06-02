-- Update asset categories to include investment subcategories
UPDATE public.asset_categories 
SET subcategories = '[
  {"value": "stocks", "label": "Stocks"},
  {"value": "etfs", "label": "ETFs"},
  {"value": "mutual_funds", "label": "Mutual Funds"},
  {"value": "bonds", "label": "Bonds"},
  {"value": "treasury_bills", "label": "Treasury Bills"},
  {"value": "corporate_bonds", "label": "Corporate Bonds"},
  {"value": "municipal_bonds", "label": "Municipal Bonds"},
  {"value": "cds", "label": "Certificates of Deposit"},
  {"value": "crypto", "label": "Cryptocurrency"},
  {"value": "options", "label": "Options"},
  {"value": "futures", "label": "Futures"},
  {"value": "commodities", "label": "Commodities"}
]'::jsonb,
metadata_schema = '{
  "symbol": {"type": "string", "required": true, "description": "Trading symbol"},
  "shares": {"type": "number", "required": true, "description": "Number of shares/units"},
  "purchase_price": {"type": "number", "required": false, "description": "Price per share at purchase"},
  "broker": {"type": "string", "required": false, "description": "Brokerage firm"},
  "account_type": {"type": "string", "required": false, "description": "Account type (401k, IRA, Taxable, etc.)"},
  "dividend_yield": {"type": "number", "required": false, "description": "Annual dividend yield percentage"},
  "maturity_date": {"type": "string", "required": false, "description": "Maturity date for bonds/CDs"},
  "interest_rate": {"type": "number", "required": false, "description": "Interest rate for bonds/CDs"},
  "currency": {"type": "string", "required": false, "description": "Currency denomination"},
  "exchange": {"type": "string", "required": false, "description": "Stock exchange"},
  "sector": {"type": "string", "required": false, "description": "Industry sector"},
  "market_cap": {"type": "string", "required": false, "description": "Market capitalization category"},
  "expense_ratio": {"type": "number", "required": false, "description": "Annual expense ratio for funds"},
  "beta": {"type": "number", "required": false, "description": "Beta coefficient"}
}'::jsonb
WHERE name = 'investments';

-- Insert investments category if it doesn't exist
INSERT INTO public.asset_categories (
  name, 
  display_name, 
  description, 
  icon_name, 
  color_theme,
  subcategories,
  metadata_schema
) 
SELECT 
  'investments',
  'Investments',
  'Stocks, bonds, ETFs, cryptocurrency, and other financial instruments',
  'TrendingUp',
  'green',
  '[
    {"value": "stocks", "label": "Stocks"},
    {"value": "etfs", "label": "ETFs"},
    {"value": "mutual_funds", "label": "Mutual Funds"},
    {"value": "bonds", "label": "Bonds"},
    {"value": "treasury_bills", "label": "Treasury Bills"},
    {"value": "corporate_bonds", "label": "Corporate Bonds"},
    {"value": "municipal_bonds", "label": "Municipal Bonds"},
    {"value": "cds", "label": "Certificates of Deposit"},
    {"value": "crypto", "label": "Cryptocurrency"},
    {"value": "options", "label": "Options"},
    {"value": "futures", "label": "Futures"},
    {"value": "commodities", "label": "Commodities"}
  ]'::jsonb,
  '{
    "symbol": {"type": "string", "required": true, "description": "Trading symbol"},
    "shares": {"type": "number", "required": true, "description": "Number of shares/units"},
    "purchase_price": {"type": "number", "required": false, "description": "Price per share at purchase"},
    "broker": {"type": "string", "required": false, "description": "Brokerage firm"},
    "account_type": {"type": "string", "required": false, "description": "Account type (401k, IRA, Taxable, etc.)"},
    "dividend_yield": {"type": "number", "required": false, "description": "Annual dividend yield percentage"},
    "maturity_date": {"type": "string", "required": false, "description": "Maturity date for bonds/CDs"},
    "interest_rate": {"type": "number", "required": false, "description": "Interest rate for bonds/CDs"},
    "currency": {"type": "string", "required": false, "description": "Currency denomination"},
    "exchange": {"type": "string", "required": false, "description": "Stock exchange"},
    "sector": {"type": "string", "required": false, "description": "Industry sector"},
    "market_cap": {"type": "string", "required": false, "description": "Market capitalization category"},
    "expense_ratio": {"type": "number", "required": false, "description": "Annual expense ratio for funds"},
    "beta": {"type": "number", "required": false, "description": "Beta coefficient"}
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.asset_categories WHERE name = 'investments');