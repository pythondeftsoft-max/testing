-- Drop conflicting INSERT policies on maintenance_appointments
DROP POLICY IF EXISTS "Admins can insert appointments" ON public.maintenance_appointments;
DROP POLICY IF EXISTS "Property owners can insert appointments" ON public.maintenance_appointments;
DROP POLICY IF EXISTS "Admins can insert maintenance appointments" ON public.maintenance_appointments;
DROP POLICY IF EXISTS "Property owners can insert maintenance appointments" ON public.maintenance_appointments;

-- Create SECURITY DEFINER function for creating appointments (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_maintenance_appointment(
  p_property_id uuid,
  p_scheduled_date timestamptz,
  p_maintenance_request_id uuid DEFAULT NULL,
  p_vendor_id uuid DEFAULT NULL,
  p_unit_id uuid DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL,
  p_estimated_duration int DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_is_recurring boolean DEFAULT false,
  p_recurring_pattern jsonb DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  maintenance_request_id uuid,
  vendor_id uuid,
  property_id uuid,
  unit_id uuid,
  tenant_id uuid,
  scheduled_date timestamptz,
  estimated_duration int,
  status text,
  notes text,
  tenant_confirmed boolean,
  vendor_confirmed boolean,
  is_recurring boolean,
  recurring_pattern jsonb,
  created_at timestamptz,
  created_by uuid,
  property_address text,
  unit_name text,
  vendor_name text,
  tenant_name text,
  portfolio_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  -- Verify caller is property owner OR system admin
  IF NOT (
    EXISTS (SELECT 1 FROM properties WHERE properties.id = p_property_id AND properties.owner_id = v_user_id)
    OR EXISTS (SELECT 1 FROM system_admins WHERE system_admins.user_id = v_user_id AND system_admins.is_active = true)
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Must be property owner or admin to create appointments';
  END IF;
  
  -- Insert the appointment
  INSERT INTO maintenance_appointments (
    property_id,
    scheduled_date,
    maintenance_request_id,
    vendor_id,
    unit_id,
    tenant_id,
    estimated_duration,
    notes,
    is_recurring,
    recurring_pattern,
    created_by,
    status
  ) VALUES (
    p_property_id,
    p_scheduled_date,
    p_maintenance_request_id,
    p_vendor_id,
    p_unit_id,
    p_tenant_id,
    p_estimated_duration,
    p_notes,
    p_is_recurring,
    p_recurring_pattern,
    v_user_id,
    'scheduled'
  )
  RETURNING maintenance_appointments.id INTO v_new_id;
  
  -- Return the created appointment with enriched data
  RETURN QUERY
  SELECT 
    ma.id,
    ma.maintenance_request_id,
    ma.vendor_id,
    ma.property_id,
    ma.unit_id,
    ma.tenant_id,
    ma.scheduled_date,
    ma.estimated_duration,
    ma.status::text,
    ma.notes,
    ma.tenant_confirmed,
    ma.vendor_confirmed,
    ma.is_recurring,
    ma.recurring_pattern,
    ma.created_at,
    ma.created_by,
    p.address AS property_address,
    COALESCE(pu.unit_name, pu.unit_number) AS unit_name,
    v.company_name AS vendor_name,
    CASE 
      WHEN prof.id IS NOT NULL THEN prof.first_name || ' ' || COALESCE(prof.last_name, '')
      ELSE NULL
    END AS tenant_name,
    p.portfolio_id
  FROM maintenance_appointments ma
  LEFT JOIN properties p ON ma.property_id = p.id
  LEFT JOIN property_units pu ON ma.unit_id = pu.id
  LEFT JOIN maintenance_vendors v ON ma.vendor_id = v.id
  LEFT JOIN profiles prof ON ma.tenant_id = prof.id
  WHERE ma.id = v_new_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_maintenance_appointment TO authenticated;