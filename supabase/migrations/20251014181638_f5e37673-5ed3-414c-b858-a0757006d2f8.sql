-- Update metadata schema for vehicle category with standardized fields
UPDATE asset_categories
SET 
  metadata_schema = '{
    "required_fields": ["year", "make"],
    "optional_fields": ["model", "usage_type", "vin_serial", "registration_number", "condition", "mileage_hours"]
  }'::jsonb,
  updated_at = now()
WHERE name = 'vehicle';