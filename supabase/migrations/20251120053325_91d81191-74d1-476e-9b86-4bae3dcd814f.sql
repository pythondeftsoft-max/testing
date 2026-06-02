-- Add payment tracking columns to unit_applications if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unit_applications' AND column_name = 'payment_method') THEN
    ALTER TABLE unit_applications ADD COLUMN payment_method TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unit_applications' AND column_name = 'payment_notes') THEN
    ALTER TABLE unit_applications ADD COLUMN payment_notes TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unit_applications' AND column_name = 'stripe_payment_intent_id') THEN
    ALTER TABLE unit_applications ADD COLUMN stripe_payment_intent_id TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'unit_applications' AND column_name = 'plaid_transaction_id') THEN
    ALTER TABLE unit_applications ADD COLUMN plaid_transaction_id TEXT;
  END IF;
END $$;

-- Add placement_fee_received action to worker_action_points_config
INSERT INTO worker_action_points_config (
  action_key,
  action_label,
  entity_type,
  from_stage,
  to_stage,
  points_value,
  is_active,
  description
) VALUES (
  'placement_fee_received',
  'Placement Fee Received',
  'property',
  'lease_signed',
  'paid_housed',
  2,
  true,
  'Worker receives 2 points when placement fee is confirmed from property owner'
)
ON CONFLICT (action_key) DO UPDATE SET
  points_value = 2,
  is_active = true,
  description = 'Worker receives 2 points when placement fee is confirmed from property owner';