
-- Add subcategories support to asset_categories table
ALTER TABLE public.asset_categories 
ADD COLUMN subcategories JSONB DEFAULT '[]'::jsonb;

-- Update the Investments category with subcategories and enhanced metadata schema
UPDATE public.asset_categories 
SET 
  subcategories = '[
    {
      "id": "cryptocurrency",
      "name": "Cryptocurrency",
      "description": "Digital currencies and crypto assets",
      "icon": "coins"
    },
    {
      "id": "stocks",
      "name": "Stocks",
      "description": "Public company equity shares",
      "icon": "trending-up"
    },
    {
      "id": "fixed_income",
      "name": "Fixed Income",
      "description": "Bonds and fixed-income securities",
      "icon": "percent"
    }
  ]'::jsonb,
  metadata_schema = '{
    "subcategory": {
      "type": "string",
      "required": true,
      "enum": ["cryptocurrency", "stocks", "fixed_income"]
    },
    "ticker_symbol": {
      "type": "string",
      "required": false,
      "description": "Trading symbol (e.g., BTC, AAPL, TSLA)"
    },
    "exchange": {
      "type": "string",
      "required": false,
      "description": "Exchange where asset is traded"
    },
    "market_cap": {
      "type": "number",
      "required": false,
      "description": "Current market capitalization"
    },
    "sector": {
      "type": "string",
      "required": false,
      "description": "Industry sector or crypto category"
    },
    "yield_percentage": {
      "type": "number",
      "required": false,
      "description": "Annual yield or dividend percentage"
    },
    "risk_rating": {
      "type": "string",
      "required": false,
      "enum": ["low", "medium", "high", "very-high"],
      "description": "Risk assessment rating"
    }
  }'::jsonb,
  updated_at = now()
WHERE name = 'investments';
