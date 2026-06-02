-- Backfill the 2 missing Stripe payments that succeeded before the fix
INSERT INTO rent_payments (
  property_id, 
  tenant_id, 
  amount, 
  original_rent_amount,
  payment_date, 
  payment_type, 
  due_date, 
  status, 
  payment_method, 
  payment_source, 
  paid_at,
  notes
) VALUES 
-- First payment
(
  '7a3ea217-00e5-4d8d-bc0a-9142a1758c8a',
  'f3d3fe29-8371-4f4b-85a5-24a2e872d8a9',
  2.00,
  2.00,
  '2025-12-06',
  'rent',
  '2025-12-12',
  'completed',
  'stripe_checkout',
  'tenant',
  '2025-12-06T02:21:00Z',
  'Backfilled - Stripe payment before webhook fix'
),
-- Second payment
(
  '7a3ea217-00e5-4d8d-bc0a-9142a1758c8a',
  'f3d3fe29-8371-4f4b-85a5-24a2e872d8a9',
  2.00,
  2.00,
  '2025-12-06',
  'rent',
  '2025-12-12',
  'completed',
  'stripe_checkout',
  'tenant',
  '2025-12-06T02:22:00Z',
  'Backfilled - Stripe payment before webhook fix'
);