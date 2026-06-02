
-- Create RPC function for belt-and-suspenders cleanup of stale computed_matches
CREATE OR REPLACE FUNCTION public.cleanup_stale_computed_matches()
RETURNS void AS $$
BEGIN
  DELETE FROM public.computed_matches
  WHERE unit_id IN (
    SELECT pu.id FROM public.property_units pu
    LEFT JOIN public.properties p ON pu.property_id = p.id
    WHERE pu.on_market = false 
       OR pu.status = 'occupied'
       OR p.on_market = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
