-- First, let's check existing demo accounts
-- Create a property for the landlord demo account
INSERT INTO properties (
  owner_id,
  address,
  street_address,
  city,
  state,
  zipcode,
  unit_count,
  monthly_rent,
  bedrooms,
  bathrooms,
  status,
  description,
  amenities,
  lease_start_date,
  lease_end_date,
  rent_due_day,
  late_fee_amount,
  late_fee_grace_days,
  has_voucher,
  voucher_type
) VALUES (
  (SELECT id FROM profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'landlord@openkey.com')),
  '456 Elm Street, Springfield, IL 62704',
  '456 Elm Street',
  'Springfield',
  'IL',
  '62704',
  1,
  1350.00,
  2,
  1.5,
  'occupied',
  'Modern 2-bedroom apartment with updated kitchen and bathroom. Section 8 approved property with on-site laundry and parking.',
  ARRAY['parking', 'laundry', 'air conditioning', 'dishwasher', 'hardwood floors'],
  '2024-12-01',
  '2025-11-30',
  1,
  50.00,
  5,
  true,
  'Housing Choice Voucher'
);

-- Get the property ID for the next steps
-- Create an approved application for the tenant demo account
INSERT INTO property_applications (
  tenant_id,
  property_id,
  status,
  priority_payment_made,
  priority_payment_amount,
  tenant_score,
  created_at,
  updated_at
) VALUES (
  (SELECT id FROM profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'tenant@openkey.com')),
  (SELECT id FROM properties WHERE address = '456 Elm Street, Springfield, IL 62704'),
  'approved',
  true,
  15.00,
  8,
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '25 days'
);

-- Create rent split information for the approved property
INSERT INTO rent_splits (
  property_id,
  total_rent,
  pha_portion,
  tenant_portion,
  effective_date,
  voucher_type,
  pha_contact_name,
  pha_contact_phone,
  pha_contact_email
) VALUES (
  (SELECT id FROM properties WHERE address = '456 Elm Street, Springfield, IL 62704'),
  1350.00,
  950.00,
  400.00,
  '2024-12-01',
  'Housing Choice Voucher',
  'Maria Rodriguez',
  '217-555-0156',
  'm.rodriguez@springfieldha.gov'
);