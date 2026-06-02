-- Update metadata_schema for vehicle category to include type-specific fields
UPDATE asset_categories
SET metadata_schema = '{
  "required_fields": ["year", "make"],
  "optional_fields": ["model", "usage_type", "vin_serial", "registration_number", "condition", "mileage_hours"],
  "type_specific_fields": {
    "equipment": {
      "required": ["equipment_type"],
      "optional": ["hours_of_use"]
    },
    "car": {
      "required": ["vehicle_type", "mileage"],
      "optional": ["license_plate"]
    },
    "boat": {
      "required": ["boat_type", "length_ft"],
      "optional": ["engine_hours"]
    },
    "aircraft": {
      "required": ["aircraft_type", "tail_number"],
      "optional": ["engine_hours"]
    },
    "rv": {
      "required": ["rv_type", "mileage"],
      "optional": []
    }
  }
}'::jsonb
WHERE name = 'vehicle';