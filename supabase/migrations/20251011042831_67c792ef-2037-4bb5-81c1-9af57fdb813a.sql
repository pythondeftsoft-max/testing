-- Update bonds & fixed income subcategories
UPDATE asset_categories
SET 
  subcategories = '[
    {"value": "government_bond", "label": "Government Bond"},
    {"value": "corporate_bond", "label": "Corporate Bond"},
    {"value": "municipal_bond", "label": "Municipal Bond"},
    {"value": "cd", "label": "Certificate of Deposit"},
    {"value": "treasury_security", "label": "Treasury Security"},
    {"value": "private_note", "label": "Private Note / Promissory Note"}
  ]'::jsonb,
  updated_at = now()
WHERE name = 'bonds';