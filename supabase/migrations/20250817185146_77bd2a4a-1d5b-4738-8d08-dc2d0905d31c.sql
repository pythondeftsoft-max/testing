
-- Extend Vehicles & Equipment with Yacht, Boat, Aircraft, etc.
UPDATE public.asset_categories
SET subcategories = '[
  {"value":"vehicles","label":"Vehicles"},
  {"value":"equipment","label":"Equipment"},
  {"value":"machinery","label":"Machinery"},
  {"value":"car","label":"Car"},
  {"value":"truck","label":"Truck"},
  {"value":"motorcycle","label":"Motorcycle"},
  {"value":"boat","label":"Boat"},
  {"value":"yacht","label":"Yacht"},
  {"value":"aircraft","label":"Aircraft"},
  {"value":"rv","label":"RV"},
  {"value":"atv","label":"ATV/UTV"}
]'::jsonb,
updated_at = now()
WHERE name = 'vehicle';

-- Extend Real Estate with Hotel and common commercial asset types
UPDATE public.asset_categories
SET subcategories = '[
  {"value":"residential_rental","label":"Residential Rental"},
  {"value":"commercial","label":"Commercial Property"},
  {"value":"land","label":"Land"},
  {"value":"primary_residence","label":"Primary Residence"},
  {"value":"vacation_home","label":"Vacation Home"},
  {"value":"real_estate_fund","label":"Real Estate Fund"},
  {"value":"hotel","label":"Hotel"},
  {"value":"office","label":"Office"},
  {"value":"retail","label":"Retail"},
  {"value":"industrial","label":"Industrial"},
  {"value":"mixed_use","label":"Mixed-Use"},
  {"value":"self_storage","label":"Self Storage"}
]'::jsonb,
updated_at = now()
WHERE name = 'real_estate';
