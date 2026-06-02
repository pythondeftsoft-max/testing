
-- Step 2: Basic Database Functions
-- Deploy get_available_vendors function
CREATE OR REPLACE FUNCTION get_available_vendors(
  p_property_id UUID,
  p_specialty maintenance_specialty DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  company_name TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  specialties maintenance_specialty[],
  hourly_rate NUMERIC,
  rating NUMERIC,
  total_jobs INTEGER,
  emergency_contact BOOLEAN,
  insurance_verified BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.company_name,
    v.contact_name,
    v.phone,
    v.email,
    v.specialties,
    v.hourly_rate,
    v.rating,
    v.total_jobs,
    v.emergency_contact,
    v.insurance_verified
  FROM maintenance_vendors v
  JOIN properties p ON (v.portfolio_id = p.portfolio_id OR v.portfolio_id IS NULL)
  WHERE p.id = p_property_id
    AND v.is_active = TRUE
    AND (p_specialty IS NULL OR p_specialty = ANY(v.specialties))
  ORDER BY v.rating DESC, v.total_jobs DESC;
END;
$$;

-- Deploy check_vendor_availability function
CREATE OR REPLACE FUNCTION check_vendor_availability(
  p_vendor_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_duration INTEGER DEFAULT 120
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  -- Check for conflicting appointments
  SELECT COUNT(*) INTO conflict_count
  FROM maintenance_appointments ma
  WHERE ma.vendor_id = p_vendor_id
    AND ma.status IN ('scheduled', 'confirmed', 'in_progress')
    AND (
      -- New appointment starts during existing appointment
      (p_start_time >= ma.scheduled_date AND p_start_time < ma.scheduled_date + (ma.estimated_duration || ' minutes')::INTERVAL)
      OR
      -- New appointment ends during existing appointment
      (p_start_time + (p_duration || ' minutes')::INTERVAL > ma.scheduled_date 
       AND p_start_time + (p_duration || ' minutes')::INTERVAL <= ma.scheduled_date + (ma.estimated_duration || ' minutes')::INTERVAL)
      OR
      -- New appointment encompasses existing appointment
      (p_start_time <= ma.scheduled_date 
       AND p_start_time + (p_duration || ' minutes')::INTERVAL >= ma.scheduled_date + (ma.estimated_duration || ' minutes')::INTERVAL)
    );
  
  RETURN conflict_count = 0;
END;
$$;

-- Deploy auto_assign_vendor function
CREATE OR REPLACE FUNCTION auto_assign_vendor(
  p_maintenance_request_id UUID,
  p_specialty maintenance_specialty DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_property_id UUID;
  v_vendor_id UUID;
  v_assigned_by UUID;
BEGIN
  -- Get property ID from maintenance request
  SELECT property_id INTO v_property_id
  FROM maintenance_requests
  WHERE id = p_maintenance_request_id;
  
  IF v_property_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get current user
  v_assigned_by := auth.uid();
  
  -- Find best available vendor
  SELECT v.id INTO v_vendor_id
  FROM get_available_vendors(v_property_id, p_specialty) v
  WHERE v.emergency_contact = TRUE OR v.rating >= 4.0
  ORDER BY v.rating DESC, v.total_jobs DESC
  LIMIT 1;
  
  IF v_vendor_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Create assignment
  INSERT INTO maintenance_assignments (
    maintenance_request_id,
    vendor_id,
    assigned_by,
    assignment_type
  ) VALUES (
    p_maintenance_request_id,
    v_vendor_id,
    v_assigned_by,
    'automatic'
  );
  
  -- Update maintenance request
  UPDATE maintenance_requests
  SET assigned_vendor_id = v_vendor_id,
      updated_at = now()
  WHERE id = p_maintenance_request_id;
  
  RETURN v_vendor_id;
END;
$$;

-- Deploy update_vendor_performance function
CREATE OR REPLACE FUNCTION update_vendor_performance(
  p_vendor_id UUID,
  p_job_completed BOOLEAN DEFAULT TRUE,
  p_rating NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_rating NUMERIC;
  v_current_jobs INTEGER;
  v_new_rating NUMERIC;
BEGIN
  -- Get current stats
  SELECT rating, total_jobs INTO v_current_rating, v_current_jobs
  FROM maintenance_vendors
  WHERE id = p_vendor_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update job count
  IF p_job_completed THEN
    v_current_jobs := v_current_jobs + 1;
  END IF;
  
  -- Calculate new rating if provided
  IF p_rating IS NOT NULL THEN
    IF v_current_jobs = 0 THEN
      v_new_rating := p_rating;
    ELSE
      -- Weighted average with existing rating
      v_new_rating := ((v_current_rating * (v_current_jobs - 1)) + p_rating) / v_current_jobs;
    END IF;
  ELSE
    v_new_rating := v_current_rating;
  END IF;
  
  -- Update vendor
  UPDATE maintenance_vendors
  SET 
    rating = v_new_rating,
    total_jobs = v_current_jobs,
    updated_at = now()
  WHERE id = p_vendor_id;
  
  RETURN TRUE;
END;
$$;
