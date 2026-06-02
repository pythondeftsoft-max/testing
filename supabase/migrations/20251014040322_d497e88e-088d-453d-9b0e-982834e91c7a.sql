-- Remove ATV/UTV, Motorcycle, Truck, and Machinery from Vehicles & Equipment category
UPDATE asset_categories
SET 
  subcategories = '[
    {"value": "equipment", "label": "Equipment"},
    {"value": "car", "label": "Car"},
    {"value": "boat", "label": "Boat"},
    {"value": "yacht", "label": "Yacht"},
    {"value": "aircraft", "label": "Aircraft"},
    {"value": "rv", "label": "RV"}
  ]'::jsonb,
  updated_at = now()
WHERE name = 'vehicle';