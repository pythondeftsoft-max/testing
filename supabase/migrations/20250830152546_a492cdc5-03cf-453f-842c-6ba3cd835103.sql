-- Add unique constraints to prevent duplicates

-- 1. Add normalized columns for efficient duplicate detection
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS normalized_address TEXT GENERATED ALWAYS AS (
  lower(regexp_replace(coalesce(address, ''), '[^a-zA-Z0-9]+', ' ', 'g'))
) STORED;

ALTER TABLE public.property_units 
ADD COLUMN IF NOT EXISTS normalized_unit_number TEXT GENERATED ALWAYS AS (
  lower(regexp_replace(coalesce(unit_number, ''), '[^a-zA-Z0-9]+', ' ', 'g'))
) STORED;

-- 2. Create partial unique indexes to prevent duplicates
-- For single-family properties: prevent same owner from having duplicate addresses
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_no_duplicate_single_family 
ON public.properties (owner_id, normalized_address)
WHERE property_type = 'house' AND deleted_at IS NULL;

-- For units: prevent duplicate unit numbers within the same property
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_units_no_duplicate_units
ON public.property_units (property_id, normalized_unit_number)
WHERE normalized_unit_number != '';

-- 3. Add helpful indexes for duplicate detection queries
CREATE INDEX IF NOT EXISTS idx_properties_normalized_address 
ON public.properties (normalized_address) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_property_units_normalized_unit 
ON public.property_units (normalized_unit_number) 
WHERE normalized_unit_number != '';

-- 4. Create a function to get friendly error messages for constraint violations
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