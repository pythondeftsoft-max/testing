-- Fix messages table: Change policies from TO public to TO authenticated
-- This provides defense-in-depth by explicitly denying anonymous access

-- Drop existing public policies
DROP POLICY IF EXISTS "Users can view messages for their applications" ON messages;
DROP POLICY IF EXISTS "Users can send messages for their applications" ON messages;
DROP POLICY IF EXISTS "Tenants can update read status for their application messages" ON messages;
DROP POLICY IF EXISTS "Property owners can update read status for their property messa" ON messages;

-- Recreate with authenticated role (same security logic, just changing the target role)
CREATE POLICY "Users can view messages for their applications" ON messages
  FOR SELECT TO authenticated
  USING (can_view_message(sender_id, property_application_id, marketplace_application_id, property_push_id, unit_application_id) OR is_admin(auth.uid()));

CREATE POLICY "Users can send messages for their applications" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() 
    AND (
      EXISTS (SELECT 1 FROM property_applications pa WHERE pa.id = messages.property_application_id 
        AND (pa.tenant_id = auth.uid() OR EXISTS (SELECT 1 FROM properties p WHERE p.id = pa.property_id AND p.owner_id = auth.uid())))
      OR EXISTS (SELECT 1 FROM marketplace_applications ma WHERE ma.id = messages.marketplace_application_id 
        AND (ma.user_id = auth.uid() OR EXISTS (SELECT 1 FROM properties p WHERE p.id = ma.property_id AND p.owner_id = auth.uid())))
    )
  );

CREATE POLICY "Tenants can update read status for their application messages" ON messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM property_applications pa WHERE pa.id = messages.property_application_id AND pa.tenant_id = auth.uid())
    OR EXISTS (SELECT 1 FROM marketplace_applications ma WHERE ma.id = messages.marketplace_application_id AND ma.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM property_pushes pp WHERE pp.id = messages.property_push_id AND pp.tenant_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM property_applications pa WHERE pa.id = messages.property_application_id AND pa.tenant_id = auth.uid())
    OR EXISTS (SELECT 1 FROM marketplace_applications ma WHERE ma.id = messages.marketplace_application_id AND ma.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM property_pushes pp WHERE pp.id = messages.property_push_id AND pp.tenant_id = auth.uid())
  );

CREATE POLICY "Property owners can update read status for their property messages" ON messages
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM property_applications pa JOIN properties p ON pa.property_id = p.id 
      WHERE pa.id = messages.property_application_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM marketplace_applications ma JOIN properties p ON ma.property_id = p.id 
      WHERE ma.id = messages.marketplace_application_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM property_pushes pp JOIN properties p ON pp.property_id = p.id 
      WHERE pp.id = messages.property_push_id AND p.owner_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM property_applications pa JOIN properties p ON pa.property_id = p.id 
      WHERE pa.id = messages.property_application_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM marketplace_applications ma JOIN properties p ON ma.property_id = p.id 
      WHERE ma.id = messages.marketplace_application_id AND p.owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM property_pushes pp JOIN properties p ON pp.property_id = p.id 
      WHERE pp.id = messages.property_push_id AND p.owner_id = auth.uid())
  );

-- Fix property_applications table: Change policies from TO public to TO authenticated

-- Drop existing public policies
DROP POLICY IF EXISTS "Tenants can view their own applications" ON property_applications;
DROP POLICY IF EXISTS "Tenants can create applications" ON property_applications;
DROP POLICY IF EXISTS "Property owners can view applications for their properties" ON property_applications;
DROP POLICY IF EXISTS "Property owners can create applications for their properties" ON property_applications;
DROP POLICY IF EXISTS "Property owners can update applications for their properties" ON property_applications;
DROP POLICY IF EXISTS "Portfolio members can view property applications" ON property_applications;
DROP POLICY IF EXISTS "Portfolio managers can update property applications" ON property_applications;

-- Recreate with authenticated role (same security logic, just changing the target role)
CREATE POLICY "Tenants can view their own applications" ON property_applications
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());

CREATE POLICY "Tenants can create applications" ON property_applications
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Property owners can view applications for their properties" ON property_applications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM properties WHERE properties.id = property_applications.property_id AND properties.owner_id = auth.uid()));

CREATE POLICY "Property owners can create applications for their properties" ON property_applications
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM properties WHERE properties.id = property_applications.property_id AND properties.owner_id = auth.uid()));

CREATE POLICY "Property owners can update applications for their properties" ON property_applications
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM properties WHERE properties.id = property_applications.property_id AND properties.owner_id = auth.uid()));

CREATE POLICY "Portfolio members can view property applications" ON property_applications
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM properties p 
    WHERE p.id = property_applications.property_id 
    AND p.portfolio_id IS NOT NULL 
    AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner', 'editor', 'viewer']::portfolio_role_type[])));

CREATE POLICY "Portfolio managers can update property applications" ON property_applications
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM properties p 
    WHERE p.id = property_applications.property_id 
    AND p.portfolio_id IS NOT NULL 
    AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner', 'editor']::portfolio_role_type[])));