-- Update get_active_rent_split function to return the most recent active rent split
CREATE OR REPLACE FUNCTION public.get_active_rent_split(
  p_property_id UUID,
  p_tenant_id UUID DEFAULT NULL
) RETURNS rent_splits
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result rent_splits;
BEGIN
  -- Get the most recent active rent split for the property, ordered by effective_date DESC
  IF p_tenant_id IS NOT NULL THEN
    SELECT * INTO result
    FROM rent_splits
    WHERE property_id = p_property_id
      AND (tenant_id = p_tenant_id OR tenant_id IS NULL)
      AND is_active = true
    ORDER BY effective_date DESC, created_at DESC
    LIMIT 1;
  ELSE
    SELECT * INTO result
    FROM rent_splits
    WHERE property_id = p_property_id
      AND is_active = true
    ORDER BY effective_date DESC, created_at DESC
    LIMIT 1;
  END IF;

  RETURN result;
END;
$$;