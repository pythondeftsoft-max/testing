-- Add display_name column for user-editable transaction names
ALTER TABLE landlord_plaid_transactions 
ADD COLUMN display_name text;