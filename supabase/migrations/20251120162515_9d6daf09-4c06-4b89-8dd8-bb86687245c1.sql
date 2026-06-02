-- Add bank transaction tracking columns to landlord_placement_fees
ALTER TABLE landlord_placement_fees 
ADD COLUMN IF NOT EXISTS bank_transaction_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS bank_transaction_date DATE,
ADD COLUMN IF NOT EXISTS bank_transaction_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS transaction_notes TEXT,
ADD COLUMN IF NOT EXISTS linked_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ;

-- Add index for bank transaction lookups
CREATE INDEX IF NOT EXISTS idx_placement_fees_bank_ref 
ON landlord_placement_fees(bank_transaction_reference) 
WHERE bank_transaction_reference IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN landlord_placement_fees.bank_transaction_reference IS 'External bank transaction reference number or ID';
COMMENT ON COLUMN landlord_placement_fees.bank_transaction_date IS 'Date of the bank transaction';
COMMENT ON COLUMN landlord_placement_fees.bank_transaction_amount IS 'Amount from bank transaction (may differ from fee_amount due to partial payments)';