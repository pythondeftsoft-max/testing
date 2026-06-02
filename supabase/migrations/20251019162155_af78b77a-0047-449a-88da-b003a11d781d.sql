-- Add test properties to marketplace with coordinates for map testing

-- Update Boulder property
UPDATE public.properties
SET 
  status = 'available',
  on_market = true,
  latitude = 40.0150,
  longitude = -105.2705,
  updated_at = now()
WHERE id = 'f241973d-9093-4c84-8994-c33ca67201a5';

-- Update Aurora property
UPDATE public.properties
SET 
  status = 'available',
  on_market = true,
  latitude = 39.7294,
  longitude = -104.8319,
  updated_at = now()
WHERE id = 'ce8bfa8d-e0b9-4e9f-b0f1-f1285864b4ce';