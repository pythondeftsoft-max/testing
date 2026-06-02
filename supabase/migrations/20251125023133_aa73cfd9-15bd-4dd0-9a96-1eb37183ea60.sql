-- Add Stripe checkout URL storage columns to landlord_placement_fees
ALTER TABLE landlord_placement_fees
ADD COLUMN IF NOT EXISTS stripe_checkout_url TEXT,
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_checkout_created_at TIMESTAMPTZ;

-- Add index for faster lookups by session_id
CREATE INDEX IF NOT EXISTS idx_landlord_placement_fees_stripe_session_id 
ON landlord_placement_fees(stripe_session_id) 
WHERE stripe_session_id IS NOT NULL;