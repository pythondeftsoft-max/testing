-- Update Alternative Investments metadata_schema with type-specific fields
UPDATE asset_categories 
SET metadata_schema = '{
  "shared_fields": {
    "insurance_value": {
      "type": "currency",
      "description": "Insurance Value",
      "required": false
    },
    "storage_location": {
      "type": "text",
      "description": "Storage Location",
      "required": false
    }
  },
  "type_specific_fields": {
    "art": {
      "artist_creator": {
        "type": "text",
        "description": "Artist / Creator",
        "required": true
      },
      "year_created": {
        "type": "year",
        "description": "Year Created",
        "required": true
      },
      "medium": {
        "type": "text",
        "description": "Medium",
        "required": true
      },
      "dimensions": {
        "type": "text",
        "description": "Dimensions",
        "required": false
      },
      "condition": {
        "type": "select",
        "description": "Condition",
        "required": false,
        "options": ["Excellent", "Good", "Fair", "Poor"]
      },
      "authentication_details": {
        "type": "textarea",
        "description": "Authentication Details",
        "required": false
      },
      "appraised_by": {
        "type": "text",
        "description": "Appraised By",
        "required": false
      }
    },
    "wine": {
      "vintage_year": {
        "type": "year",
        "description": "Vintage Year",
        "required": true
      },
      "producer_vineyard": {
        "type": "text",
        "description": "Producer / Vineyard",
        "required": true
      },
      "bottle_count": {
        "type": "integer",
        "description": "Bottle Count",
        "required": true
      },
      "region": {
        "type": "text",
        "description": "Region",
        "required": false
      },
      "storage_method": {
        "type": "select",
        "description": "Storage Method",
        "required": false,
        "options": ["Cellar", "Temp-Controlled", "Pro Storage", "Other"]
      },
      "condition": {
        "type": "select",
        "description": "Condition",
        "required": false,
        "options": ["Pristine", "Good", "Damaged Label", "Compromised", "Corked"]
      },
      "authentication_details": {
        "type": "textarea",
        "description": "Authentication Details",
        "required": false
      }
    },
    "watches": {
      "brand": {
        "type": "text",
        "description": "Brand",
        "required": true
      },
      "model": {
        "type": "text",
        "description": "Model",
        "required": true
      },
      "serial_number": {
        "type": "text",
        "description": "Serial Number",
        "required": false
      },
      "material": {
        "type": "text",
        "description": "Material",
        "required": false
      },
      "carat_weight": {
        "type": "text",
        "description": "Carat / Weight",
        "required": false
      },
      "certificate_provider": {
        "type": "text",
        "description": "Certificate Provider (e.g., GIA)",
        "required": false
      },
      "condition": {
        "type": "select",
        "description": "Condition",
        "required": false,
        "options": ["Excellent", "Good", "Fair", "Poor"]
      }
    },
    "sports_memorabilia": {
      "player_event": {
        "type": "text",
        "description": "Player / Event",
        "required": true
      },
      "year": {
        "type": "year",
        "description": "Year",
        "required": false
      },
      "item_type": {
        "type": "text",
        "description": "Item Type (jersey/bat/card/etc.)",
        "required": false
      },
      "signed": {
        "type": "boolean",
        "description": "Signed",
        "required": false
      },
      "authentication_provider": {
        "type": "text",
        "description": "Authentication Provider (PSA/JSA/Beckett)",
        "required": false
      },
      "condition": {
        "type": "select",
        "description": "Condition",
        "required": false,
        "options": ["Excellent", "Good", "Fair", "Poor"]
      }
    },
    "antiques": {
      "origin_country": {
        "type": "text",
        "description": "Origin / Country",
        "required": true
      },
      "period_era": {
        "type": "text",
        "description": "Period / Era",
        "required": true
      },
      "material": {
        "type": "text",
        "description": "Material",
        "required": false
      },
      "condition": {
        "type": "select",
        "description": "Condition",
        "required": false,
        "options": ["Excellent", "Good", "Fair", "Poor"]
      },
      "appraised_by": {
        "type": "text",
        "description": "Appraised By",
        "required": false
      },
      "historical_notes": {
        "type": "textarea",
        "description": "Historical Notes",
        "required": false
      }
    },
    "memorabilia": {
      "type_of_item": {
        "type": "text",
        "description": "Type of Item",
        "required": true
      },
      "event_occasion": {
        "type": "text",
        "description": "Event / Occasion",
        "required": false
      },
      "signed_by": {
        "type": "text",
        "description": "Signed By",
        "required": false
      },
      "authentication_provider": {
        "type": "text",
        "description": "Authentication Provider",
        "required": false
      },
      "condition": {
        "type": "select",
        "description": "Condition",
        "required": false,
        "options": ["Excellent", "Good", "Fair", "Poor"]
      }
    },
    "intellectual_property": {
      "ip_type": {
        "type": "select",
        "description": "IP Type",
        "required": true,
        "options": ["Patent", "Trademark", "Copyright", "Trade Secret"]
      },
      "registration_number": {
        "type": "text",
        "description": "Registration / Application No.",
        "required": true
      },
      "expiration_date": {
        "type": "date",
        "description": "Expiration / Renewal Date",
        "required": false
      },
      "ownership_percentage": {
        "type": "number",
        "description": "Ownership %",
        "required": false
      },
      "annual_royalties": {
        "type": "currency",
        "description": "Annual Royalties",
        "required": false
      },
      "licensee": {
        "type": "text",
        "description": "Licensee",
        "required": false
      }
    }
  }
}'::jsonb,
updated_at = now()
WHERE name = 'alternatives';