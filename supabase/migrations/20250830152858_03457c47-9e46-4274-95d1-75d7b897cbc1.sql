-- Clean up existing duplicates before adding constraints

-- First, let's identify and handle duplicate properties
WITH duplicate_properties AS (
  SELECT 
    owner_id,
    lower(regexp_replace(coalesce(address, ''), '[^a-zA-Z0-9]+', ' ', 'g')) as normalized_addr,
    array_agg(id ORDER BY created_at DESC) as property_ids,
    count(*) as duplicate_count
  FROM public.properties 
  WHERE property_type = 'house' 
    AND deleted_at IS NULL 
  GROUP BY owner_id, normalized_addr
  HAVING count(*) > 1
),
properties_to_delete AS (
  SELECT 
    unnest(property_ids[2:]) as property_id_to_delete
  FROM duplicate_properties
)
-- Soft delete duplicate properties (keep the newest one)
UPDATE public.properties 
SET deleted_at = now(), 
    status = 'deleted'
WHERE id IN (SELECT property_id_to_delete FROM properties_to_delete);

-- Clean up duplicate units within properties
WITH duplicate_units AS (
  SELECT 
    property_id,
    lower(regexp_replace(coalesce(unit_number, ''), '[^a-zA-Z0-9]+', ' ', 'g')) as normalized_unit,
    array_agg(id ORDER BY created_at DESC) as unit_ids,
    count(*) as duplicate_count
  FROM public.property_units 
  WHERE unit_number IS NOT NULL AND unit_number != ''
  GROUP BY property_id, normalized_unit
  HAVING count(*) > 1
),
units_to_delete AS (
  SELECT 
    unnest(unit_ids[2:]) as unit_id_to_delete
  FROM duplicate_units
)
-- Delete duplicate units (keep the newest one)
DELETE FROM public.property_units 
WHERE id IN (SELECT unit_id_to_delete FROM units_to_delete);

-- Now add the normalized columns and constraints
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS normalized_address TEXT GENERATED ALWAYS AS (
  lower(regexp_replace(coalesce(address, ''), '[^a-zA-Z0-9]+', ' ', 'g'))
) STORED;

ALTER TABLE public.property_units 
ADD COLUMN IF NOT EXISTS normalized_unit_number TEXT GENERATED ALWAYS AS (
  lower(regexp_replace(coalesce(unit_number, ''), '[^a-zA-Z0-9]+', ' ', 'g'))
) STORED;

-- Create partial unique indexes to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_no_duplicate_single_family 
ON public.properties (owner_id, normalized_address)
WHERE property_type = 'house' AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_property_units_no_duplicate_units
ON public.property_units (property_id, normalized_unit_number)
WHERE normalized_unit_number != '';

-- Add helpful indexes for duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_properties_normalized_address 
ON public.properties (normalized_address) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_property_units_normalized_unit 
ON public.property_units (normalized_unit_number) 
WHERE normalized_unit_number != '';

-- Create function for friendly error messages
CREATE OR REPLACE FUNCTION public.get_duplicate_violation_message(
  constraint_name text,
  table_name text
) RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE constraint_name
    WHEN 'idx_properties_no_duplicate_single_family' THEN
      RETURN 'A single-family house with this address already exists in your portfolio. Duplicate properties are not allowed.';
    WHEN 'idx_property_units_no_duplicate_units' THEN  
      RETURN 'A unit with this number already exists in this property. Duplicate units are not allowed.';
    ELSE
      RETURN 'This record would create a duplicate entry that is not allowed.';
  END CASE;
END;
$$;