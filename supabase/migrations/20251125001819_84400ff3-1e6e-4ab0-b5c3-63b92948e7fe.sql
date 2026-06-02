-- Clear old Plaid-linked bank accounts to test with fresh credentials
DELETE FROM user_bank_accounts
WHERE plaid_item_id IS NOT NULL;