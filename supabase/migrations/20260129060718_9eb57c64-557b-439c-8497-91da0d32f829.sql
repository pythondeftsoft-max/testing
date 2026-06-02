-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage pillars" ON blog_pillars;

-- Create updated policy that checks both account_roles AND profiles.user_type
CREATE POLICY "Admins can manage pillars"
ON blog_pillars
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM account_roles
    WHERE account_roles.user_id = auth.uid()
    AND account_roles.role_name = ANY (ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type])
    AND account_roles.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);