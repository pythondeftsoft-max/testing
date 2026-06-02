-- Drop existing restrictive policies on plaid_admin_transactions
DROP POLICY IF EXISTS "Admin users can view plaid transactions" ON plaid_admin_transactions;
DROP POLICY IF EXISTS "Admin users can insert plaid transactions" ON plaid_admin_transactions;
DROP POLICY IF EXISTS "Admin users can update plaid transactions" ON plaid_admin_transactions;

-- Create comprehensive policies for SELECT
CREATE POLICY "System admins and account staff can view plaid transactions"
  ON plaid_admin_transactions
  FOR SELECT
  USING (
    -- System admins (workers with user_type = 'admin')
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
    OR
    -- Account-level roles that handle payments (owner, admin_partner, editor)
    EXISTS (
      SELECT 1 FROM account_roles
      WHERE account_roles.user_id = auth.uid()
      AND account_roles.role_name IN ('owner', 'admin_partner', 'editor')
      AND account_roles.is_active = true
    )
  );

-- Create comprehensive policies for INSERT
CREATE POLICY "System admins and account staff can insert plaid transactions"
  ON plaid_admin_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM account_roles
      WHERE account_roles.user_id = auth.uid()
      AND account_roles.role_name IN ('owner', 'admin_partner', 'editor')
      AND account_roles.is_active = true
    )
  );

-- Create comprehensive policies for UPDATE
CREATE POLICY "System admins and account staff can update plaid transactions"
  ON plaid_admin_transactions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM account_roles
      WHERE account_roles.user_id = auth.uid()
      AND account_roles.role_name IN ('owner', 'admin_partner', 'editor')
      AND account_roles.is_active = true
    )
  );