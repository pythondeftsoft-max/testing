-- Add INSERT policies for maintenance_appointments that allow direct property-based creation
-- (without requiring a maintenance_request_id)

-- 1. Admins can create any appointment
CREATE POLICY "Admins can create any appointment"
ON public.maintenance_appointments
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- 2. Property owners can create appointments directly for their properties
CREATE POLICY "Property owners can create appointments for their properties directly"
ON public.maintenance_appointments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = maintenance_appointments.property_id
    AND p.owner_id = auth.uid()
  )
);

-- 3. Portfolio managers can create appointments for portfolio properties
CREATE POLICY "Portfolio managers can create appointments for portfolio properties directly"
ON public.maintenance_appointments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = maintenance_appointments.property_id
    AND p.portfolio_id IS NOT NULL
    AND public.has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner'::public.portfolio_role_type, 'editor'::public.portfolio_role_type])
  )
);