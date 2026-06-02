-- Fix on_market status for housed properties and their units
-- 1. Set PROPERTIES to off-market for housed properties
UPDATE properties
SET 
  on_market = false,
  status = 'occupied',
  updated_at = NOW()
WHERE id IN (
  '7a3ea217-00e5-4d8d-bc0a-9142a1758c8a',  -- 160 East Walnut
  '8c3bedb5-8058-42b2-b0b6-4e08579f0391'   -- 5194 Coney Island
);

-- 2. Set PROPERTY_UNITS to occupied and off-market
UPDATE property_units
SET 
  status = 'occupied',
  on_market = false,
  pipeline_stage = 'paid_housed',
  updated_at = NOW()
WHERE id IN (
  '590d2ae9-3d1a-43d7-8ccd-54cb1a747c37',  -- 160 East Walnut Unit 1
  '16d7e01e-f61e-4ddb-99dc-018affd3b787'   -- 5194 Coney Island Unit 1
);