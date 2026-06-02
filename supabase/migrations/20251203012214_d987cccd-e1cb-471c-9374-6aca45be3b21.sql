-- Drop conflicting RLS SELECT policies on maintenance_appointments
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.maintenance_appointments;
DROP POLICY IF EXISTS "Property owners view their appointments" ON public.maintenance_appointments;
DROP POLICY IF EXISTS "Landlords can view appointments for their properties" ON public.maintenance_appointments;
DROP POLICY IF EXISTS "Tenants can view their appointments" ON public.maintenance_appointments;

-- Create SECURITY DEFINER function for ADMIN - returns ALL appointments (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_admin_all_appointments()
RETURNS TABLE (
  id uuid,
  scheduled_date timestamptz,
  estimated_duration integer,
  status text,
  notes text,
  tenant_confirmed boolean,
  vendor_confirmed boolean,
  property_address text,
  unit_name text,
  vendor_name text,
  tenant_name text,
  landlord_name text,
  property_id uuid,
  unit_id uuid,
  vendor_id uuid,
  maintenance_request_id uuid,
  tenant_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is system admin
  IF NOT EXISTS (SELECT 1 FROM system_admins WHERE user_id = auth.uid() AND is_active = true) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;
  
  RETURN QUERY 
  SELECT 
    ma.id,
    ma.scheduled_date,
    ma.estimated_duration,
    ma.status,
    ma.notes,
    ma.tenant_confirmed,
    ma.vendor_confirmed,
    p.address AS property_address,
    COALESCE(pu.unit_name, pu.unit_number) AS unit_name,
    mv.company_name AS vendor_name,
    COALESCE(
      t.full_name,
      CASE WHEN t.first_name IS NOT NULL AND t.last_name IS NOT NULL 
           THEN t.first_name || ' ' || t.last_name 
           ELSE rt.full_name END,
      CASE WHEN rt.first_name IS NOT NULL AND rt.last_name IS NOT NULL 
           THEN rt.first_name || ' ' || rt.last_name 
           ELSE NULL END
    ) AS tenant_name,
    CASE WHEN o.first_name IS NOT NULL AND o.last_name IS NOT NULL 
         THEN o.first_name || ' ' || o.last_name 
         ELSE NULL END AS landlord_name,
    ma.property_id,
    ma.unit_id,
    ma.vendor_id,
    ma.maintenance_request_id,
    ma.tenant_id
  FROM maintenance_appointments ma
  LEFT JOIN properties p ON ma.property_id = p.id
  LEFT JOIN property_units pu ON ma.unit_id = pu.id
  LEFT JOIN maintenance_vendors mv ON ma.vendor_id = mv.id
  LEFT JOIN profiles t ON ma.tenant_id = t.id
  LEFT JOIN maintenance_requests mr ON ma.maintenance_request_id = mr.id
  LEFT JOIN profiles rt ON mr.tenant_id = rt.id
  LEFT JOIN profiles o ON p.owner_id = o.id
  ORDER BY ma.scheduled_date DESC;
END;
$$;

-- Create SECURITY DEFINER function for LANDLORD - returns their property appointments (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_landlord_appointments(p_portfolio_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  scheduled_date timestamptz,
  estimated_duration integer,
  status text,
  notes text,
  tenant_confirmed boolean,
  vendor_confirmed boolean,
  property_address text,
  unit_name text,
  vendor_name text,
  tenant_name text,
  property_id uuid,
  unit_id uuid,
  vendor_id uuid,
  maintenance_request_id uuid,
  tenant_id uuid,
  portfolio_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    ma.id,
    ma.scheduled_date,
    ma.estimated_duration,
    ma.status,
    ma.notes,
    ma.tenant_confirmed,
    ma.vendor_confirmed,
    p.address AS property_address,
    COALESCE(pu.unit_name, pu.unit_number) AS unit_name,
    mv.company_name AS vendor_name,
    COALESCE(
      t.full_name,
      CASE WHEN t.first_name IS NOT NULL AND t.last_name IS NOT NULL 
           THEN t.first_name || ' ' || t.last_name 
           ELSE rt.full_name END,
      CASE WHEN rt.first_name IS NOT NULL AND rt.last_name IS NOT NULL 
           THEN rt.first_name || ' ' || rt.last_name 
           ELSE NULL END
    ) AS tenant_name,
    ma.property_id,
    ma.unit_id,
    ma.vendor_id,
    ma.maintenance_request_id,
    ma.tenant_id,
    p.portfolio_id
  FROM maintenance_appointments ma
  JOIN properties p ON ma.property_id = p.id
  LEFT JOIN property_units pu ON ma.unit_id = pu.id
  LEFT JOIN maintenance_vendors mv ON ma.vendor_id = mv.id
  LEFT JOIN profiles t ON ma.tenant_id = t.id
  LEFT JOIN maintenance_requests mr ON ma.maintenance_request_id = mr.id
  LEFT JOIN profiles rt ON mr.tenant_id = rt.id
  WHERE p.owner_id = auth.uid()
    AND (p_portfolio_id IS NULL OR p.portfolio_id = p_portfolio_id)
  ORDER BY ma.scheduled_date ASC;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_admin_all_appointments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_landlord_appointments(uuid) TO authenticated;