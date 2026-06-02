-- Add plaid_access_token column to user_bank_accounts
ALTER TABLE user_bank_accounts 
ADD COLUMN IF NOT EXISTS plaid_access_token TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN user_bank_accounts.plaid_access_token IS 'Encrypted Plaid access token for fetching transactions and account data';