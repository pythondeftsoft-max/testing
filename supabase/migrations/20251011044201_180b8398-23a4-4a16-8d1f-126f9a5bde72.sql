-- Add "Fixed Income" as first subcategory for bonds category
UPDATE asset_categories 
SET subcategories = jsonb_build_array(
  jsonb_build_object('value', 'fixed_income', 'label', 'Fixed Income'),
  jsonb_build_object('value', 'government_bond', 'label', 'Government Bond'),
  jsonb_build_object('value', 'corporate_bond', 'label', 'Corporate Bond'),
  jsonb_build_object('value', 'municipal_bond', 'label', 'Municipal Bond'),
  jsonb_build_object('value', 'cd', 'label', 'Certificate of Deposit'),
  jsonb_build_object('value', 'treasury_security', 'label', 'Treasury Security'),
  jsonb_build_object('value', 'private_note', 'label', 'Private Note / Promissory Note')
),
updated_at = now()
WHERE name = 'bonds';