-- COMPREHENSIVE SECURITY HARDENING: Sensitive Tables & Critical Policies
-- This migration hardens PII-containing tables and transitions policies from TO public to TO authenticated

-- ============================================
-- Phase 1: Harden tax_profiles (SSN/EIN data)
-- ============================================

DROP POLICY IF EXISTS "Admins can view all tax profiles" ON tax_profiles;
DROP POLICY IF EXISTS "Portfolio members can view tax profiles" ON tax_profiles;
DROP POLICY IF EXISTS "Users can manage their own tax profiles" ON tax_profiles;
DROP POLICY IF EXISTS "Users can view their own tax profiles" ON tax_profiles;

CREATE POLICY "Admins can view all tax profiles" ON tax_profiles
FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Portfolio members can view tax profiles" ON tax_profiles
FOR SELECT TO authenticated USING (
  portfolio_id IS NOT NULL AND 
  has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner'::portfolio_role_type, 'editor'::portfolio_role_type])
);

CREATE POLICY "Users can manage their own tax profiles" ON tax_profiles
FOR ALL TO authenticated USING (user_id = auth.uid());

-- ============================================
-- Phase 2: Harden hap_payee_configs (Bank routing)
-- ============================================

DROP POLICY IF EXISTS "Admins can view all HAP payee configs" ON hap_payee_configs;
DROP POLICY IF EXISTS "Property owners can manage HAP payee configs" ON hap_payee_configs;
DROP POLICY IF EXISTS "Property owners can view tenant HAP configs" ON hap_payee_configs;
DROP POLICY IF EXISTS "Tenants can manage their HAP payee configs" ON hap_payee_configs;

CREATE POLICY "Admins can view all HAP payee configs" ON hap_payee_configs
FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Property owners can manage HAP payee configs" ON hap_payee_configs
FOR ALL TO authenticated USING (
  can_access_hap_features(auth.uid()) AND (
    (property_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM properties WHERE id = hap_payee_configs.property_id AND owner_id = auth.uid()
    )) OR
    (unit_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM property_units pu JOIN properties p ON pu.property_id = p.id
      WHERE pu.id = hap_payee_configs.unit_id AND p.owner_id = auth.uid()
    ))
  )
);

CREATE POLICY "Tenants can manage their HAP payee configs" ON hap_payee_configs
FOR ALL TO authenticated USING (tenant_id = auth.uid());

-- ============================================
-- Phase 3: Harden hap_payments (Payment records)
-- ============================================

DROP POLICY IF EXISTS "Admins can view all HAP payments" ON hap_payments;
DROP POLICY IF EXISTS "Property owners can manage HAP payments" ON hap_payments;
DROP POLICY IF EXISTS "Tenants can view their HAP payments" ON hap_payments;
DROP POLICY IF EXISTS "Property owners can view HAP payments" ON hap_payments;

CREATE POLICY "Admins can view all HAP payments" ON hap_payments
FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Property owners can manage HAP payments" ON hap_payments
FOR ALL TO authenticated USING (
  can_access_hap_features(auth.uid()) AND (
    (property_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM properties WHERE id = hap_payments.property_id AND owner_id = auth.uid()
    )) OR
    (unit_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM property_units pu JOIN properties p ON pu.property_id = p.id
      WHERE pu.id = hap_payments.unit_id AND p.owner_id = auth.uid()
    ))
  )
);

CREATE POLICY "Tenants can view their HAP payments" ON hap_payments
FOR SELECT TO authenticated USING (tenant_id = auth.uid());

-- ============================================
-- Phase 4: Harden access_grants & access_requests
-- ============================================

DROP POLICY IF EXISTS "Admins can manage all grants" ON access_grants;
DROP POLICY IF EXISTS "Users can view their grants" ON access_grants;
DROP POLICY IF EXISTS "Grant creators can manage their grants" ON access_grants;

CREATE POLICY "Admins can manage all grants" ON access_grants
FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their grants" ON access_grants
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Grant creators can manage their grants" ON access_grants
FOR ALL TO authenticated USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all requests" ON access_requests;
DROP POLICY IF EXISTS "Requesters can view their requests" ON access_requests;
DROP POLICY IF EXISTS "Requesters can create requests" ON access_requests;

CREATE POLICY "Admins can manage all requests" ON access_requests
FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Requesters can view their requests" ON access_requests
FOR SELECT TO authenticated USING (requester_id = auth.uid());

CREATE POLICY "Requesters can create requests" ON access_requests
FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());

-- ============================================
-- Phase 5: Harden maintenance_requests
-- ============================================

DROP POLICY IF EXISTS "Admins can manage all maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Property owners can manage maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Tenants can create maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Tenants can view their maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Assigned vendors can view maintenance requests" ON maintenance_requests;

CREATE POLICY "Admins can manage all maintenance requests" ON maintenance_requests
FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Property owners can manage maintenance requests" ON maintenance_requests
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM properties WHERE id = maintenance_requests.property_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "Tenants can create maintenance requests" ON maintenance_requests
FOR INSERT TO authenticated WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenants can view their maintenance requests" ON maintenance_requests
FOR SELECT TO authenticated USING (tenant_id = auth.uid());

CREATE POLICY "Assigned vendors can view maintenance requests" ON maintenance_requests
FOR SELECT TO authenticated USING (assigned_vendor_id = auth.uid());

-- ============================================
-- Phase 6: Harden rent_payments
-- ============================================

DROP POLICY IF EXISTS "Landlords can manage rent payments for their properties" ON rent_payments;
DROP POLICY IF EXISTS "Tenants can view their own rent payments" ON rent_payments;
DROP POLICY IF EXISTS "Admins can manage all rent payments" ON rent_payments;

CREATE POLICY "Admins can manage all rent payments" ON rent_payments
FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Landlords can manage rent payments for their properties" ON rent_payments
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM properties WHERE id = rent_payments.property_id AND owner_id = auth.uid()
  )
);

CREATE POLICY "Tenants can view their own rent payments" ON rent_payments
FOR SELECT TO authenticated USING (tenant_id = auth.uid());

-- ============================================
-- Phase 7: Harden notifications
-- ============================================

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON notifications;

CREATE POLICY "Users can view their own notifications" ON notifications
FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage all notifications" ON notifications
FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- ============================================
-- Phase 8: Create tax_id masking function
-- ============================================

CREATE OR REPLACE FUNCTION mask_tax_id(tax_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF tax_id IS NULL OR LENGTH(tax_id) < 4 THEN
    RETURN '****';
  END IF;
  RETURN '****' || RIGHT(tax_id, 4);
END;
$$;

-- Grant execute to authenticated users only
REVOKE ALL ON FUNCTION mask_tax_id(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION mask_tax_id(TEXT) TO authenticated;