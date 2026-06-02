DROP POLICY IF EXISTS "Admins can manage structured pages" ON structured_pages;

CREATE POLICY "Admins can manage structured pages"
  ON structured_pages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM account_roles
      WHERE account_roles.user_id = auth.uid()
        AND account_roles.role_name IN ('owner', 'admin_partner')
        AND account_roles.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM system_admins
      WHERE system_admins.user_id = auth.uid()
        AND system_admins.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_roles
      WHERE account_roles.user_id = auth.uid()
        AND account_roles.role_name IN ('owner', 'admin_partner')
        AND account_roles.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM system_admins
      WHERE system_admins.user_id = auth.uid()
        AND system_admins.is_active = true
    )
  );