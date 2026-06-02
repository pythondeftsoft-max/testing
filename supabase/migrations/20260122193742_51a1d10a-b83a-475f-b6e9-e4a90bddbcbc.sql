-- FINAL SECURITY FIX: Eliminate all public-targeted policies

-- ============================================
-- Phase 1: Fix user_sessions (Session Hijacking Risk)
-- ============================================

-- Drop the dangerous public policy that allows anyone to manage sessions
DROP POLICY IF EXISTS "System can manage sessions" ON user_sessions;

-- Add secure service_role-only policy for internal system operations
CREATE POLICY "Service role can manage sessions" ON user_sessions
FOR ALL TO service_role USING (true);

-- ============================================
-- Phase 2: Harden profiles table (PII Exposure)
-- ============================================

-- Drop all existing public-targeted policies
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Landlords can view tenant profiles for applicants" ON profiles;
DROP POLICY IF EXISTS "Account role managers can view profiles for user lookup" ON profiles;

-- Recreate with authenticated role requirement (same logic, just TO authenticated)
CREATE POLICY "Users can read their own profile" ON profiles
FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON profiles
FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "Landlords can view tenant profiles for applicants" ON profiles
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM property_applications pa
    JOIN properties p ON pa.property_id = p.id
    WHERE pa.tenant_id = profiles.id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Account role managers can view profiles for user lookup" ON profiles
FOR SELECT TO authenticated USING (
  has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type])
);