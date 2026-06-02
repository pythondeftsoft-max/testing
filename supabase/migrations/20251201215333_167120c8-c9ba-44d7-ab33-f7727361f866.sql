-- Create a function to sync rent_due_day from recurring_charges to properties
CREATE OR REPLACE FUNCTION sync_rent_due_day_from_recurring_charges()
RETURNS TABLE(property_id uuid, old_due_day int, new_due_day int, address text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE properties p
  SET rent_due_day = EXTRACT(DAY FROM rc.start_date)::int
  FROM recurring_charges rc
  WHERE rc.property_id = p.id
  AND rc.is_active = true
  AND rc.charge_type = 'rent'
  AND p.rent_due_day != EXTRACT(DAY FROM rc.start_date)::int
  AND rc.start_date IS NOT NULL
  RETURNING p.id, p.rent_due_day - EXTRACT(DAY FROM rc.start_date)::int + EXTRACT(DAY FROM rc.start_date)::int, EXTRACT(DAY FROM rc.start_date)::int, p.address;
END;
$$;