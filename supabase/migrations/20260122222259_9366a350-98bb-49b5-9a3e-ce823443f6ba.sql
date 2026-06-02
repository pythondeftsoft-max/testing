-- COMPLETE SECURITY HARDENING: All remaining public-targeted policies
-- This migration fixes 12 policies across 3 tables

-- ============================================
-- Phase 1: Harden user_sessions (6 policies)
-- ============================================

DROP POLICY IF EXISTS "Security admins can delete sessions" ON user_sessions;
DROP POLICY IF EXISTS "Security admins can manage all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Security admins can view all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can manage their own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;

CREATE POLICY "Security admins can delete sessions" ON user_sessions
FOR DELETE TO authenticated 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "Security admins can manage all sessions" ON user_sessions
FOR UPDATE TO authenticated 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "Security admins can view all sessions" ON user_sessions
FOR SELECT TO authenticated 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "Users can insert their own sessions" ON user_sessions
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage their own sessions" ON user_sessions
FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can view their own sessions" ON user_sessions
FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ============================================
-- Phase 2: Harden tenant_profiles (4 policies)
-- ============================================

DROP POLICY IF EXISTS "Admins can manage all tenant profiles" ON tenant_profiles;
DROP POLICY IF EXISTS "Property owners can create tenant profile details for applicant" ON tenant_profiles;
DROP POLICY IF EXISTS "Property owners can view tenant profiles of applicants" ON tenant_profiles;
DROP POLICY IF EXISTS "Users can manage their own tenant profile" ON tenant_profiles;

CREATE POLICY "Admins can manage all tenant profiles" ON tenant_profiles
FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Property owners can create tenant profile details for applicant" ON tenant_profiles
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (
    SELECT 1 FROM property_applications pa
    JOIN properties p ON pa.property_id = p.id
    WHERE pa.tenant_id = tenant_profiles.user_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Property owners can view tenant profiles of applicants" ON tenant_profiles
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM property_applications pa
    JOIN properties p ON pa.property_id = p.id
    WHERE pa.tenant_id = tenant_profiles.user_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own tenant profile" ON tenant_profiles
FOR ALL TO authenticated USING (user_id = auth.uid());

-- ============================================
-- Phase 3: Harden admin_messages (2 policies)
-- ============================================

DROP POLICY IF EXISTS "Admins can send messages" ON admin_messages;
DROP POLICY IF EXISTS "Admins can view messages" ON admin_messages;

CREATE POLICY "Admins can send messages" ON admin_messages
FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can view messages" ON admin_messages
FOR SELECT TO authenticated USING (is_admin(auth.uid()));