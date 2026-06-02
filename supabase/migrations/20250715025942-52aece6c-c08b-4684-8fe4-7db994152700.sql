-- Add missing rent split data for the property to restore HAP/tenant breakdown
-- Using a 60/40 split (HAP: $840, Tenant: $560) for testing purposes

INSERT INTO rent_splits (
  property_id,
  total_rent,
  pha_portion,
  tenant_portion,
  effective_date,
  voucher_type,
  created_at,
  updated_at
) VALUES (
  '42e5d1ed-d300-4f3b-b604-11137fd2ea25',
  1400.00,
  840.00,
  560.00,
  CURRENT_DATE,
  'Section 8',
  NOW(),
  NOW()
);