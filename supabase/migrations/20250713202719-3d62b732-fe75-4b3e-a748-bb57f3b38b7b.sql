-- Add rent splits data for the tenant's approved property to test HAP/tenant breakdown
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
) 
SELECT 
  p.id,
  1200.00,
  800.00,
  400.00,
  '2025-01-01'::date,
  'Housing Choice Voucher',
  'Sarah Johnson',
  '708-555-0987',
  's.johnson@ciceroha.gov'
FROM properties p 
WHERE p.address = '567 Community Way, Cicero, IL 60804'
AND NOT EXISTS (SELECT 1 FROM rent_splits rs WHERE rs.property_id = p.id);