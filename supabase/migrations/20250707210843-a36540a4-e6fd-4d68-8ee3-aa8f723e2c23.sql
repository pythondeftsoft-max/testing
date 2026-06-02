-- Update the demo tenant to have an approved application
UPDATE property_applications 
SET status = 'approved' 
WHERE tenant_id = (SELECT id FROM profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'))
AND property_id = '9ed03125-82ab-4a2b-b05c-7302820fae87';

-- Create rent split for the approved property
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
  '9ed03125-82ab-4a2b-b05c-7302820fae87',
  1400.00,
  900.00,
  500.00,
  '2025-06-27',
  'Housing Choice Voucher',
  'Jennifer Smith',
  '314-555-0123',
  'j.smith@mha.gov'
) ON CONFLICT (property_id) DO UPDATE SET
  total_rent = EXCLUDED.total_rent,
  pha_portion = EXCLUDED.pha_portion,
  tenant_portion = EXCLUDED.tenant_portion,
  pha_contact_name = EXCLUDED.pha_contact_name,
  pha_contact_phone = EXCLUDED.pha_contact_phone,
  pha_contact_email = EXCLUDED.pha_contact_email;

-- Update tenant profile with voucher information
UPDATE tenant_profiles 
SET voucher_status = 'yes',
    voucher_holder = true,
    housing_authority = 'Metropolitan Housing Authority',
    voucher_amount = 900.00
WHERE user_id = (SELECT id FROM profiles WHERE id = (SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'));