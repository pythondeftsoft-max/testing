-- First drop the existing function to allow changing return type
DROP FUNCTION IF EXISTS public.get_property_vacancy_summary(UUID);

-- Recreate with correct vacancy rate calculation and vacant_units column
CREATE OR REPLACE FUNCTION public.get_property_vacancy_summary(property_id_param UUID)
RETURNS TABLE(
  total_units INTEGER,
  available_units INTEGER,
  vacant_units INTEGER,
  occupied_units INTEGER,
  maintenance_units INTEGER,
  vacancy_rate NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH unit_stats AS (
    SELECT 
      COUNT(*)::INTEGER as total,
      COUNT(CASE WHEN pu.status = 'available' THEN 1 END)::INTEGER as available,
      COUNT(CASE WHEN pu.status = 'vacant' THEN 1 END)::INTEGER as vacant,
      COUNT(CASE WHEN pu.status = 'occupied' THEN 1 END)::INTEGER as occupied,
      COUNT(CASE WHEN pu.status = 'maintenance' THEN 1 END)::INTEGER as maintenance
    FROM public.property_units pu
    WHERE pu.property_id = property_id_param
  )
  SELECT 
    us.total,
    us.available,
    us.vacant,
    us.occupied,
    us.maintenance,
    -- Vacancy rate = % of units NOT occupied
    CASE 
      WHEN us.total > 0 THEN ROUND(((us.total - us.occupied)::NUMERIC / us.total::NUMERIC * 100), 1)
      ELSE 0 
    END as vacancy_rate
  FROM unit_stats us;
END;
$$;