-- Remove Yacht from Vehicles & Equipment category (redundant with Boat)
UPDATE asset_categories
SET 
  subcategories = '[
    {"value": "equipment", "label": "Equipment"},
    {"value": "car", "label": "Car"},
    {"value": "boat", "label": "Boat"},
    {"value": "aircraft", "label": "Aircraft"},
    {"value": "rv", "label": "RV"}
  ]'::jsonb,
  updated_at = now()
WHERE name = 'vehicle';