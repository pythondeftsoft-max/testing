-- Add link_status column to track expired/cancelled links
ALTER TABLE landlord_placement_fees 
ADD COLUMN IF NOT EXISTS link_status TEXT DEFAULT 'active';

-- Add comment for documentation
COMMENT ON COLUMN landlord_placement_fees.link_status IS 'Status of payment link: active, expired, or cancelled';

-- Update the existing message for 1360 scotch mountain road to show correct $760 amount
UPDATE messages
SET 
  payload = jsonb_set(payload, '{fee_amount}', '760'),
  message_text = REPLACE(message_text, '$1900.00', '$760.00')
WHERE id = '92304263-eed4-4fa0-85ca-70af6d67a58c';

-- Mark the old placement fee link as expired (needs regeneration)
UPDATE landlord_placement_fees
SET link_status = 'expired'
WHERE id = 'd6e9231c-a934-46c4-8ac3-27ca35b9f6e4';