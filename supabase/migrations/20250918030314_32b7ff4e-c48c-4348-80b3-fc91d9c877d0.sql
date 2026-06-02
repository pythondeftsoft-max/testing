-- Add more sample properties for testing the property filter dropdown
INSERT INTO properties (
  owner_id,
  address,
  property_type,
  bedrooms,
  bathrooms,
  monthly_rent,
  status,
  created_at,
  updated_at
) VALUES 
(
  'ccb8536c-80d1-4834-9614-169b9a7caede',
  '456 Oak Avenue, Manhattan, NY 10001',
  'apartment',
  2,
  1,
  2800.00,
  'occupied',
  now(),
  now()
),
(
  'ccb8536c-80d1-4834-9614-169b9a7caede', 
  '789 Elm Street, Queens, NY 11375',
  'house',
  3,
  2,
  3200.00,
  'vacant',
  now(),
  now()
),
(
  'ccb8536c-80d1-4834-9614-169b9a7caede',
  '321 Maple Drive, Bronx, NY 10458',
  'condo',
  1,
  1,
  2100.00,
  'occupied',
  now(),  
  now()
),
(
  'ccb8536c-80d1-4834-9614-169b9a7caede',
  '654 Cedar Lane, Staten Island, NY 10301', 
  'house',
  4,
  3,
  3800.00,
  'maintenance',
  now(),
  now()
);