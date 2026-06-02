-- Add more realistic tenant insurance sample data with diverse policy types and scenarios
INSERT INTO tenant_insurance (
  property_id, 
  tenant_id, 
  provider_name, 
  policy_number, 
  policy_type, 
  liability_coverage, 
  personal_property_coverage, 
  effective_date, 
  expiration_date, 
  premium_amount, 
  is_active
) VALUES 
-- Active policies with various types
(
  (SELECT id FROM properties WHERE address LIKE '%Oak%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
  'State Farm',
  'SF-HO4-2024001',
  'HO-4',
  300000,
  50000,
  '2024-01-15',
  '2025-01-15',
  85.00,
  true
),
(
  (SELECT id FROM properties WHERE address LIKE '%Main%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
  'Allstate',
  'ALL-COMP-2024002',
  'Comprehensive Coverage',
  250000,
  40000,
  '2024-03-01',
  '2025-03-01',
  92.50,
  true
),
(
  (SELECT id FROM properties WHERE address LIKE '%Elm%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
  'Liberty Mutual',
  'LM-BL-2024003',
  'Basic Liability',
  100000,
  20000,
  '2024-06-10',
  '2025-06-10',
  65.00,
  true
),
-- Expiring soon policies
(
  (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at LIMIT 1 OFFSET 1),
  'Farmers Insurance',
  'FM-TP-2024004',
  'Third-party',
  200000,
  35000,
  '2024-02-01',
  '2025-02-28',
  78.00,
  true
),
-- Expired policies
(
  (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 2),
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at LIMIT 1 OFFSET 1),
  'Progressive',
  'PROG-MSI-2023001',
  'MSI',
  150000,
  25000,
  '2023-12-01',
  '2024-12-01',
  68.00,
  false
),
-- More active policies
(
  (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 3),
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at LIMIT 1 OFFSET 2),
  'GEICO',
  'GEI-HO4-2024005',
  'HO-4',
  400000,
  60000,
  '2024-05-15',
  '2025-05-15',
  105.00,
  true
),
(
  (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 4),
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at LIMIT 1 OFFSET 3),
  'Nationwide',
  'NW-COMP-2024006',
  'Comprehensive Coverage',
  350000,
  55000,
  '2024-04-01',
  '2025-04-01',
  98.75,
  true
);

-- Update existing records to use proper policy types
UPDATE tenant_insurance 
SET policy_type = 'MSI' 
WHERE policy_type = 'msi';