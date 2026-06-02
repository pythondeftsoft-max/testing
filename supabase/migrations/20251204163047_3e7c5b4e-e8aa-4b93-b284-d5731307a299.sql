
-- Create the missing HAP payment record for the $1,800 split
INSERT INTO hap_payments (
  property_id,
  unit_id,
  tenant_id,
  payment_period_start,
  payment_period_end,
  expected_amount,
  actual_amount,
  payment_date,
  payment_method,
  payment_status,
  verification_method,
  plaid_transaction_id,
  plaid_split_id,
  matched_via_plaid,
  notes,
  recorded_by
) VALUES (
  NULL,
  'befcf220-cd88-43fa-b2a8-74465500fcdc',
  '0d4d9f9e-5551-4afb-a9ef-412d895d215f',
  '2025-11-01',
  '2025-11-30',
  1800,
  1800,
  '2025-11-20',
  'ach',  -- Valid: ach, check, wire
  'received',
  'plaid',
  'dLeA5ywoxDu8N1PPQqlPuBJK734X1MiJyAPQV',
  'c73daf2e-1147-4366-85d0-574ededd6281',
  true,
  'Tagged from bank deposit: Multi-Unit Deposit - Oak Street Property',
  'ccb8536c-80d1-4834-9614-169b9a7caede'
);
