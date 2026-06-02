-- Create table for Plaid admin transactions
CREATE TABLE plaid_admin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plaid_transaction_id text UNIQUE NOT NULL,
  bank_account_id uuid REFERENCES user_bank_accounts(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  amount numeric(10,2) NOT NULL,
  description text,
  merchant_name text,
  pending boolean DEFAULT false,
  category text,
  plaid_data jsonb,
  linked_fee_id uuid REFERENCES landlord_placement_fees(id) ON DELETE SET NULL,
  matched_at timestamptz,
  matched_by_user_id uuid REFERENCES auth.users(id),
  auto_matched boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE plaid_admin_transactions ENABLE ROW LEVEL SECURITY;

-- Admin users can view all transactions
CREATE POLICY "Admin users can view plaid transactions"
  ON plaid_admin_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM account_roles
      WHERE account_roles.user_id = auth.uid()
      AND account_roles.role_name = 'admin_partner'
      AND account_roles.is_active = true
    )
  );

-- Admin users can insert transactions
CREATE POLICY "Admin users can insert plaid transactions"
  ON plaid_admin_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_roles
      WHERE account_roles.user_id = auth.uid()
      AND account_roles.role_name = 'admin_partner'
      AND account_roles.is_active = true
    )
  );

-- Admin users can update transactions
CREATE POLICY "Admin users can update plaid transactions"
  ON plaid_admin_transactions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM account_roles
      WHERE account_roles.user_id = auth.uid()
      AND account_roles.role_name = 'admin_partner'
      AND account_roles.is_active = true
    )
  );

-- Create indices for performance
CREATE INDEX idx_plaid_admin_transactions_bank_account 
  ON plaid_admin_transactions(bank_account_id);
  
CREATE INDEX idx_plaid_admin_transactions_unmatched 
  ON plaid_admin_transactions(linked_fee_id) 
  WHERE linked_fee_id IS NULL;

CREATE INDEX idx_plaid_admin_transactions_date
  ON plaid_admin_transactions(transaction_date DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_plaid_admin_transactions_updated_at
  BEFORE UPDATE ON plaid_admin_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();