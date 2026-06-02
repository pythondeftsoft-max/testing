-- Update get_computed_property_status to check marketplace_applications and property_units
CREATE OR REPLACE FUNCTION public.get_computed_property_status(
  p_property_id UUID
) RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  property_record RECORD;
  computed_status TEXT;
BEGIN
  SELECT 
    p.*,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM property_applications pa 
        WHERE pa.property_id = p.id 
        AND pa.status = 'approved'
      ) OR EXISTS (
        SELECT 1 FROM marketplace_applications ma 
        WHERE ma.property_id = p.id 
        AND ma.status IN ('housed', 'lease_signed')
      ) OR EXISTS (
        SELECT 1 FROM property_units pu
        WHERE pu.property_id = p.id
        AND (pu.tenant_id IS NOT NULL OR pu.current_tenant_id IS NOT NULL)
        AND pu.status = 'occupied'
      ) THEN true 
      ELSE false 
    END as has_tenant
  INTO property_record
  FROM properties p 
  WHERE p.id = p_property_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF property_record.has_tenant AND property_record.on_market THEN
    computed_status := 'Occupied / Listed';
  ELSIF property_record.has_tenant THEN
    computed_status := 'Occupied';
  ELSIF property_record.on_market THEN
    computed_status := 'Available';
  ELSE
    computed_status := 'Vacant';
  END IF;

  RETURN computed_status;
END;
$$;

-- Fix existing data for 160 East Walnut Street
UPDATE property_units 
SET tenant_id = current_tenant_id
WHERE id = '590d2ae9-3d1a-43d7-8ccd-54cb1a747c37'
  AND current_tenant_id IS NOT NULL
  AND tenant_id IS NULL;

UPDATE properties 
SET status = 'occupied'
WHERE id = '7a3ea217-00e5-4d8d-bc0a-9142a1758c8a';

UPDATE marketplace_applications
SET 
  lifecycle_stage = 'current_tenant',
  became_tenant_at = COALESCE(became_tenant_at, NOW())
WHERE property_id = '7a3ea217-00e5-4d8d-bc0a-9142a1758c8a'
  AND status = 'housed'
  AND lifecycle_stage != 'current_tenant';