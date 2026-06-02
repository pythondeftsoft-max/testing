-- Drop the broken policy that has NULL with_check (silently blocks updates)
DROP POLICY IF EXISTS "Users can view their own tenant profile" ON tenant_profiles;

-- Create a proper policy that allows users to fully manage their own profile
CREATE POLICY "Users can manage their own tenant profile" ON tenant_profiles
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());