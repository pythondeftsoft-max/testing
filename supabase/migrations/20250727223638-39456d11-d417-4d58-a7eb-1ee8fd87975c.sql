-- Create missing RPC functions for vendor availability and scheduling

-- Function to check vendor availability
CREATE OR REPLACE FUNCTION public.check_vendor_availability(
  p_vendor_id uuid,
  p_start_time timestamp with time zone,
  p_duration integer DEFAULT 120
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  conflict_count integer;
  p_end_time timestamp with time zone;
BEGIN
  -- Calculate end time
  p_end_time := p_start_time + (p_duration || ' minutes')::interval;
  
  -- Check for conflicting appointments
  SELECT COUNT(*) INTO conflict_count
  FROM maintenance_appointments
  WHERE vendor_id = p_vendor_id
    AND status NOT IN ('cancelled', 'completed')
    AND (
      -- New appointment overlaps with existing ones
      (scheduled_date <= p_start_time AND (scheduled_date + (estimated_duration || ' minutes')::interval) > p_start_time)
      OR
      (scheduled_date < p_end_time AND (scheduled_date + (estimated_duration || ' minutes')::interval) >= p_end_time)
      OR
      (scheduled_date >= p_start_time AND scheduled_date < p_end_time)
    );
  
  RETURN conflict_count = 0;
END;
$$;

-- Function to get available vendors for a property and specialty
CREATE OR REPLACE FUNCTION public.get_available_vendors(
  p_property_id uuid,
  p_specialty text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  company_name text,
  contact_person text,
  phone text,
  email text,
  specialties text[],
  hourly_rate numeric,
  rating numeric,
  response_time text,
  service_areas text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mv.id,
    mv.company_name,
    mv.contact_person,
    mv.phone,
    mv.email,
    mv.specialties,
    mv.hourly_rate,
    mv.rating,
    mv.response_time,
    mv.service_areas
  FROM maintenance_vendors mv
  JOIN properties p ON p.id = p_property_id
  WHERE mv.is_active = true
    AND (p_specialty IS NULL OR p_specialty = ANY(mv.specialties))
    AND (
      mv.service_areas IS NULL 
      OR array_length(mv.service_areas, 1) IS NULL
      OR p.city = ANY(mv.service_areas)
      OR p.state = ANY(mv.service_areas)
    )
  ORDER BY mv.rating DESC, mv.hourly_rate ASC;
END;
$$;