-- Seed comprehensive asset categories with metadata schemas
INSERT INTO public.asset_categories (name, display_name, description, icon_name, color_theme, subcategories, metadata_schema) VALUES

-- Stocks and Equities
('stocks', 'Stocks & Equities', 'Individual stocks, ETFs, and equity investments', 'TrendingUp', 'blue', 
 '[
   {"value": "individual_stock", "label": "Individual Stock"},
   {"value": "etf", "label": "ETF"},
   {"value": "mutual_fund", "label": "Mutual Fund"},
   {"value": "reit", "label": "REIT"},
   {"value": "index_fund", "label": "Index Fund"}
 ]'::jsonb,
 '{
   "symbol": {"type": "string", "required": true, "description": "Stock ticker symbol"},
   "exchange": {"type": "string", "required": false, "description": "Exchange (NYSE, NASDAQ, etc.)"},
   "shares": {"type": "number", "required": true, "description": "Number of shares owned"},
   "dividend_yield": {"type": "number", "required": false, "description": "Annual dividend yield %"},
   "sector": {"type": "string", "required": false, "description": "Industry sector"},
   "market_cap": {"type": "string", "required": false, "description": "Market capitalization"}
 }'::jsonb),

-- Cryptocurrency
('cryptocurrency', 'Cryptocurrency', 'Digital currencies and crypto assets', 'Bitcoin', 'orange',
 '[
   {"value": "bitcoin", "label": "Bitcoin"},
   {"value": "ethereum", "label": "Ethereum"},
   {"value": "altcoin", "label": "Altcoin"},
   {"value": "stablecoin", "label": "Stablecoin"},
   {"value": "defi", "label": "DeFi Token"},
   {"value": "nft", "label": "NFT"}
 ]'::jsonb,
 '{
   "symbol": {"type": "string", "required": true, "description": "Crypto symbol (BTC, ETH, etc.)"},
   "amount": {"type": "number", "required": true, "description": "Amount owned"},
   "wallet_address": {"type": "string", "required": false, "description": "Wallet address"},
   "staking_yield": {"type": "number", "required": false, "description": "Staking yield %"},
   "blockchain": {"type": "string", "required": false, "description": "Blockchain network"}
 }'::jsonb),

-- Real Estate
('real_estate', 'Real Estate', 'Property investments and real estate assets', 'Home', 'green',
 '[
   {"value": "residential_rental", "label": "Residential Rental"},
   {"value": "commercial", "label": "Commercial Property"},
   {"value": "land", "label": "Land"},
   {"value": "primary_residence", "label": "Primary Residence"},
   {"value": "vacation_home", "label": "Vacation Home"},
   {"value": "real_estate_fund", "label": "Real Estate Fund"}
 ]'::jsonb,
 '{
   "address": {"type": "string", "required": false, "description": "Property address"},
   "property_type": {"type": "string", "required": false, "description": "Single family, condo, etc."},
   "square_footage": {"type": "number", "required": false, "description": "Square footage"},
   "bedrooms": {"type": "number", "required": false, "description": "Number of bedrooms"},
   "bathrooms": {"type": "number", "required": false, "description": "Number of bathrooms"},
   "rental_income": {"type": "number", "required": false, "description": "Monthly rental income"},
   "property_taxes": {"type": "number", "required": false, "description": "Annual property taxes"}
 }'::jsonb),

-- Bonds and Fixed Income
('bonds', 'Bonds & Fixed Income', 'Government and corporate bonds, CDs, and fixed income securities', 'Receipt', 'purple',
 '[
   {"value": "government_bond", "label": "Government Bond"},
   {"value": "corporate_bond", "label": "Corporate Bond"},
   {"value": "municipal_bond", "label": "Municipal Bond"},
   {"value": "cd", "label": "Certificate of Deposit"},
   {"value": "treasury_bill", "label": "Treasury Bill"},
   {"value": "savings_bond", "label": "Savings Bond"}
 ]'::jsonb,
 '{
   "issuer": {"type": "string", "required": false, "description": "Bond issuer"},
   "face_value": {"type": "number", "required": false, "description": "Face value at maturity"},
   "coupon_rate": {"type": "number", "required": false, "description": "Annual coupon rate %"},
   "maturity_date": {"type": "date", "required": false, "description": "Maturity date"},
   "credit_rating": {"type": "string", "required": false, "description": "Credit rating (AAA, AA, etc.)"},
   "yield_to_maturity": {"type": "number", "required": false, "description": "Yield to maturity %"}
 }'::jsonb),

-- Commodities
('commodities', 'Commodities', 'Gold, silver, oil, and other physical commodities', 'Package', 'yellow',
 '[
   {"value": "precious_metals", "label": "Precious Metals"},
   {"value": "energy", "label": "Energy"},
   {"value": "agriculture", "label": "Agriculture"},
   {"value": "industrial_metals", "label": "Industrial Metals"},
   {"value": "livestock", "label": "Livestock"}
 ]'::jsonb,
 '{
   "commodity_type": {"type": "string", "required": false, "description": "Gold, silver, oil, etc."},
   "quantity": {"type": "number", "required": false, "description": "Quantity owned"},
   "unit": {"type": "string", "required": false, "description": "Unit of measurement (oz, barrels, etc.)"},
   "purity": {"type": "string", "required": false, "description": "Purity level (for metals)"},
   "storage_location": {"type": "string", "required": false, "description": "Where stored"},
   "storage_fees": {"type": "number", "required": false, "description": "Annual storage fees"}
 }'::jsonb),

-- Private Equity & Venture Capital
('private_equity', 'Private Equity', 'Private equity, venture capital, and private investments', 'Users', 'red',
 '[
   {"value": "private_equity_fund", "label": "Private Equity Fund"},
   {"value": "venture_capital", "label": "Venture Capital"},
   {"value": "private_company_stock", "label": "Private Company Stock"},
   {"value": "hedge_fund", "label": "Hedge Fund"},
   {"value": "private_debt", "label": "Private Debt"}
 ]'::jsonb,
 '{
   "fund_name": {"type": "string", "required": false, "description": "Fund or company name"},
   "fund_manager": {"type": "string", "required": false, "description": "Fund manager"},
   "vintage_year": {"type": "number", "required": false, "description": "Investment vintage year"},
   "commitment_amount": {"type": "number", "required": false, "description": "Total commitment"},
   "called_capital": {"type": "number", "required": false, "description": "Capital called"},
   "distributions": {"type": "number", "required": false, "description": "Total distributions received"}
 }'::jsonb),

-- Business Ownership
('business', 'Business Ownership', 'Ownership stakes in businesses and partnerships', 'Building2', 'indigo',
 '[
   {"value": "sole_proprietorship", "label": "Sole Proprietorship"},
   {"value": "partnership", "label": "Partnership"},
   {"value": "llc_ownership", "label": "LLC Ownership"},
   {"value": "corporation_stock", "label": "Corporation Stock"},
   {"value": "franchise", "label": "Franchise"}
 ]'::jsonb,
 '{
   "business_name": {"type": "string", "required": false, "description": "Business name"},
   "ownership_percentage": {"type": "number", "required": false, "description": "Ownership percentage"},
   "business_type": {"type": "string", "required": false, "description": "Type of business"},
   "employee_count": {"type": "number", "required": false, "description": "Number of employees"},
   "annual_revenue": {"type": "number", "required": false, "description": "Annual revenue"},
   "profit_margin": {"type": "number", "required": false, "description": "Profit margin %"}
 }'::jsonb),

-- Cash and Cash Equivalents
('cash', 'Cash & Equivalents', 'Cash, savings accounts, and money market funds', 'DollarSign', 'gray',
 '[
   {"value": "checking_account", "label": "Checking Account"},
   {"value": "savings_account", "label": "Savings Account"},
   {"value": "money_market", "label": "Money Market"},
   {"value": "cash", "label": "Physical Cash"},
   {"value": "short_term_fund", "label": "Short-term Fund"}
 ]'::jsonb,
 '{
   "account_type": {"type": "string", "required": false, "description": "Account type"},
   "financial_institution": {"type": "string", "required": false, "description": "Bank or institution"},
   "account_number": {"type": "string", "required": false, "description": "Account number (last 4 digits)"},
   "interest_rate": {"type": "number", "required": false, "description": "Interest rate %"},
   "fdic_insured": {"type": "boolean", "required": false, "description": "FDIC insured"}
 }'::jsonb),

-- Alternative Investments
('alternatives', 'Alternative Investments', 'Art, collectibles, and other alternative assets', 'Palette', 'pink',
 '[
   {"value": "art", "label": "Art & Collectibles"},
   {"value": "wine", "label": "Wine"},
   {"value": "classic_cars", "label": "Classic Cars"},
   {"value": "watches", "label": "Watches & Jewelry"},
   {"value": "sports_memorabilia", "label": "Sports Memorabilia"},
   {"value": "intellectual_property", "label": "Intellectual Property"}
 ]'::jsonb,
 '{
   "item_description": {"type": "string", "required": false, "description": "Description of item"},
   "artist_creator": {"type": "string", "required": false, "description": "Artist or creator"},
   "year_created": {"type": "number", "required": false, "description": "Year created/made"},
   "authentication": {"type": "string", "required": false, "description": "Authentication details"},
   "insurance_value": {"type": "number", "required": false, "description": "Insurance value"},
   "storage_location": {"type": "string", "required": false, "description": "Storage location"}
 }'::jsonb)

ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  color_theme = EXCLUDED.color_theme,
  subcategories = EXCLUDED.subcategories,
  metadata_schema = EXCLUDED.metadata_schema,
  updated_at = now();