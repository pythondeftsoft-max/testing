-- Create RPC function to get active rent split for a property
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
  -- Get the most recent active rent split for the property
  IF p_tenant_id IS NOT NULL THEN
    SELECT * INTO result
    FROM rent_splits
    WHERE property_id = p_property_id
      AND tenant_id = p_tenant_id
      AND is_active = true
    ORDER BY effective_date DESC
    LIMIT 1;
  ELSE
    SELECT * INTO result
    FROM rent_splits
    WHERE property_id = p_property_id
      AND is_active = true
    ORDER BY effective_date DESC
    LIMIT 1;
  END IF;

  RETURN result;
END;
$$;