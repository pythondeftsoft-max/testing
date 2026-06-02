-- Merge Business Ownership and Private Equity into Private Equity & Business

-- Step 1: Update private_equity category with merged subcategories
UPDATE asset_categories 
SET 
  display_name = 'Private Equity & Business',
  description = 'Private equity, venture capital, and business ownership interests',
  subcategories = '[
    {"value": "private_equity_fund", "label": "Private Equity Fund"},
    {"value": "venture_capital", "label": "Venture Capital"},
    {"value": "private_company_stock", "label": "Private Company Stock"},
    {"value": "hedge_fund", "label": "Hedge Fund"},
    {"value": "private_debt", "label": "Private Debt"},
    {"value": "sole_proprietorship", "label": "Sole Proprietorship"},
    {"value": "partnership", "label": "Partnership"},
    {"value": "llc_ownership", "label": "LLC Ownership"},
    {"value": "corporation_stock", "label": "Corporation Stock (Private)"},
    {"value": "franchise", "label": "Franchise"}
  ]'::jsonb,
  icon_name = 'Briefcase',
  color_theme = 'purple',
  updated_at = now()
WHERE name = 'private_equity';

-- Step 2: Deactivate the business category
UPDATE asset_categories 
SET 
  is_active = false,
  updated_at = now()
WHERE name = 'business';