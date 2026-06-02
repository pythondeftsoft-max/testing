-- Step 1: Update demo tenant profile with complete voucher/financial info
UPDATE tenant_profiles
SET 
  voucher_amount = 1450.00,
  monthly_income = 2800.00,
  max_rent = 1600.00,
  updated_at = NOW()
WHERE user_id = '01669022-a31a-4746-bf9f-45c8b9733e21';

-- Step 2: Accept one application (move to "approved" status)
UPDATE property_applications
SET 
  status = 'approved',
  status_updated_at = NOW(),
  landlord_response = 'accepted',
  landlord_viewed_at = NOW(),
  updated_at = NOW()
WHERE id = '5e36215d-4a2d-4802-9115-eb74f7512ba2';

-- Step 3: Create lease lifecycle record (pair tenant to property)
INSERT INTO lease_lifecycle_tracking (
  property_id,
  tenant_id,
  lease_start_date,
  lease_end_date,
  monthly_rent,
  security_deposit,
  lease_status
) VALUES (
  '401a568f-75be-4670-8007-96d688fe358d',
  '01669022-a31a-4746-bf9f-45c8b9733e21',
  '2025-01-01',
  '2026-01-01',
  1450.00,
  1450.00,
  'active'
)
ON CONFLICT DO NOTHING;

-- Step 4: Create tenant-property connection and update housing status
INSERT INTO tenant_properties (
  tenant_id,
  property_id,
  application_id,
  monthly_rent,
  lease_start_date,
  lease_end_date,
  is_active
) VALUES (
  '01669022-a31a-4746-bf9f-45c8b9733e21',
  '401a568f-75be-4670-8007-96d688fe358d',
  '5e36215d-4a2d-4802-9115-eb74f7512ba2',
  1450.00,
  '2025-01-01',
  '2026-01-01',
  true
)
ON CONFLICT DO NOTHING;

-- Step 5: Update housing_status to 'housed' after tenant-property connection created
UPDATE property_applications
SET 
  housing_status = 'housed',
  updated_at = NOW()
WHERE id = '5e36215d-4a2d-4802-9115-eb74f7512ba2';