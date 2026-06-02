-- Add RLS policies for maintenance_appointments table

-- 1. Allow landlords (property owners) to SELECT appointments for their properties
CREATE POLICY "Property owners can view appointments for their properties"
ON maintenance_appointments
FOR SELECT
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

-- 2. Allow landlords to INSERT appointments for their properties
CREATE POLICY "Property owners can create appointments for their properties"
ON maintenance_appointments
FOR INSERT
WITH CHECK (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

-- 3. Allow landlords to UPDATE their property appointments
CREATE POLICY "Property owners can update appointments for their properties"
ON maintenance_appointments
FOR UPDATE
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

-- 4. Allow landlords to DELETE their property appointments
CREATE POLICY "Property owners can delete appointments for their properties"
ON maintenance_appointments
FOR DELETE
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

-- 5. Allow admins to SELECT all appointments
CREATE POLICY "Admins can view all appointments"
ON maintenance_appointments
FOR SELECT
USING (
  public.is_admin(auth.uid())
);

-- 6. Allow admins to INSERT appointments
CREATE POLICY "Admins can create appointments"
ON maintenance_appointments
FOR INSERT
WITH CHECK (
  public.is_admin(auth.uid())
);

-- 7. Allow admins to UPDATE all appointments
CREATE POLICY "Admins can update all appointments"
ON maintenance_appointments
FOR UPDATE
USING (
  public.is_admin(auth.uid())
);

-- 8. Allow admins to DELETE all appointments
CREATE POLICY "Admins can delete all appointments"
ON maintenance_appointments
FOR DELETE
USING (
  public.is_admin(auth.uid())
);

-- 9. Allow tenants to view appointments where they are the tenant_id
CREATE POLICY "Tenants can view their appointments"
ON maintenance_appointments
FOR SELECT
USING (
  tenant_id = auth.uid()
);