-- Fix status for marketplace properties
-- These properties have on_market=true and coordinates, but need status updated to 'available'

UPDATE public.properties
SET 
  status = 'available',
  updated_at = now()
WHERE id IN (
  'f241973d-9093-4c84-8994-c33ca67201a5',
  'ce8bfa8d-e0b9-4e9f-b0f1-f1285864b4ce'
)
AND status != 'available';

-- Verify the update
DO $$
DECLARE
  updated_count INTEGER;
  available_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM public.properties
  WHERE id IN (
    'f241973d-9093-4c84-8994-c33ca67201a5',
    'ce8bfa8d-e0b9-4e9f-b0f1-f1285864b4ce'
  );
  
  SELECT COUNT(*) INTO available_count
  FROM public.properties
  WHERE id IN (
    'f241973d-9093-4c84-8994-c33ca67201a5',
    'ce8bfa8d-e0b9-4e9f-b0f1-f1285864b4ce'
  )
  AND status = 'available'
  AND on_market = true
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL;
  
  RAISE NOTICE 'Total properties found: %, Properties ready for marketplace: %', updated_count, available_count;
END $$;