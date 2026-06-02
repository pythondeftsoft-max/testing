-- Remove generic "vehicles" subcategory from vehicles_equipment category
-- This removes redundancy since we have specific vehicle types like car, truck, etc.

UPDATE asset_categories 
SET 
  subcategories = jsonb_path_query_array(
    subcategories, 
    '$[*] ? (@.value != "vehicles")'
  ),
  updated_at = now()
WHERE name = 'vehicle';