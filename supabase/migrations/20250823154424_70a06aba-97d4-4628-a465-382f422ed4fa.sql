-- Create enhanced tenant profile function for admin access
CREATE OR REPLACE FUNCTION public.get_enhanced_tenant_profile(p_tenant_id uuid)
RETURNS TABLE(
  -- Basic profile info
  id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  user_type text,
  created_at timestamptz,
  
  -- Tenant profile details
  date_of_birth date,
  ssn text,
  current_address text,
  current_city text,
  current_state text,
  current_zip text,
  employment_status text,
  employer_name text,
  job_title text,
  monthly_income numeric,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  voucher_status text,
  voucher_amount numeric,
  move_in_window text,
  background_check_status text,
  credit_score integer,
  previous_address text,
  previous_landlord_name text,
  previous_landlord_phone text,
  
  -- Property and application info
  property_id uuid,
  property_address text,
  property_city text,
  property_state text,
  property_zip text,
  monthly_rent numeric,
  lease_start_date date,
  lease_end_date date,
  application_status text,
  application_date timestamptz,
  
  -- Risk assessment
  risk_score integer,
  
  -- Counts
  unread_messages_count integer,
  open_maintenance_requests_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Basic profile info
    p.id,
    p.first_name,
    p.last_name,
    au.email,
    p.phone,
    p.user_type::text,
    p.created_at,
    
    -- Tenant profile details
    tp.date_of_birth,
    tp.ssn,
    tp.current_address,
    tp.current_city,
    tp.current_state,
    tp.current_zip,
    tp.employment_status,
    tp.employer_name,
    tp.job_title,
    tp.monthly_income,
    tp.emergency_contact_name,
    tp.emergency_contact_phone,
    tp.emergency_contact_relationship,
    tp.voucher_status,
    tp.voucher_amount,
    tp.move_in_window,
    tp.background_check_status,
    tp.credit_score,
    tp.previous_address,
    tp.previous_landlord_name,
    tp.previous_landlord_phone,
    
    -- Property and application info
    prop.id as property_id,
    prop.address as property_address,
    prop.city as property_city,
    prop.state as property_state,
    prop.zip_code as property_zip,
    prop.monthly_rent,
    prop.lease_start_date,
    prop.lease_end_date,
    pa.status as application_status,
    pa.created_at as application_date,
    
    -- Risk assessment
    COALESCE(tp.risk_score, 5) as risk_score,
    
    -- Counts
    COALESCE(msg_count.unread_count, 0)::integer as unread_messages_count,
    COALESCE(maint_count.open_count, 0)::integer as open_maintenance_requests_count
    
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  LEFT JOIN public.tenant_profiles tp ON p.id = tp.user_id
  LEFT JOIN public.property_applications pa ON p.id = pa.tenant_id AND pa.status = 'approved'
  LEFT JOIN public.properties prop ON pa.property_id = prop.id
  LEFT JOIN (
    SELECT 
      tc.tenant_id,
      COUNT(*) as unread_count
    FROM public.tenant_communications tc
    WHERE tc.read_at IS NULL
    GROUP BY tc.tenant_id
  ) msg_count ON p.id = msg_count.tenant_id
  LEFT JOIN (
    SELECT 
      pa2.tenant_id,
      COUNT(*) as open_count
    FROM public.maintenance_requests mr
    JOIN public.property_applications pa2 ON mr.property_id = pa2.property_id
    WHERE mr.status != 'completed' AND pa2.status = 'approved'
    GROUP BY pa2.tenant_id
  ) maint_count ON p.id = maint_count.tenant_id
  WHERE p.id = p_tenant_id;
END;
$$;