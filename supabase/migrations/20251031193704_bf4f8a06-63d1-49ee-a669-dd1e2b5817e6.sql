-- Insert mock properties for testing QuickMatchStudio
-- Using unique addresses to avoid duplicates

INSERT INTO properties (
  address,
  street_address,
  city,
  state,
  zipcode,
  bedrooms,
  bathrooms,
  square_feet,
  monthly_rent,
  status,
  move_in_date,
  description,
  owner_id,
  default_tenant_type
) VALUES
  -- Property 1: Affordable 1BR
  ('2847 Atlantic Avenue, Brooklyn, NY 11207', '2847 Atlantic Avenue', 'Brooklyn', 'NY', '11207', 1, 1, 650, 1272, 'available', CURRENT_DATE, 'Cozy 1-bedroom apartment in prime Brooklyn location. Recently renovated with modern fixtures.', (SELECT id FROM profiles LIMIT 1), 'market_rate'),
  
  -- Property 2: Spacious 3BR
  ('4193 Flatbush Avenue, Brooklyn, NY 11234', '4193 Flatbush Avenue', 'Brooklyn', 'NY', '11234', 3, 2.5, 1200, 2100, 'available', CURRENT_DATE, 'Spacious 3-bedroom with 2.5 bathrooms. Perfect for families. Near subway.', (SELECT id FROM profiles LIMIT 1), 'market_rate'),
  
  -- Property 3: Mid-range 2BR
  ('7526 Bedford Avenue, Brooklyn, NY 11249', '7526 Bedford Avenue', 'Brooklyn', 'NY', '11249', 2, 1, 850, 1850, 'available', CURRENT_DATE + INTERVAL '15 days', 'Modern 2-bedroom apartment with hardwood floors. Available mid-December.', (SELECT id FROM profiles LIMIT 1), 'market_rate'),
  
  -- Property 4: Premium 3BR
  ('1638 Nostrand Avenue, Brooklyn, NY 11226', '1638 Nostrand Avenue', 'Brooklyn', 'NY', '11226', 3, 2, 1400, 2500, 'available', CURRENT_DATE + INTERVAL '30 days', 'Beautiful 3-bedroom house with backyard. Available January 1st.', (SELECT id FROM profiles LIMIT 1), 'market_rate'),
  
  -- Property 5: Budget 1BR
  ('8842 Utica Avenue, Brooklyn, NY 11203', '8842 Utica Avenue', 'Brooklyn', 'NY', '11203', 1, 1, 600, 1600, 'available', CURRENT_DATE, 'Affordable 1-bedroom in quiet neighborhood. Pet-friendly.', (SELECT id FROM profiles LIMIT 1), 'voucher'),
  
  -- Property 6: Nice 2BR
  ('3721 Kings Highway, Brooklyn, NY 11234', '3721 Kings Highway', 'Brooklyn', 'NY', '11234', 2, 2, 950, 2200, 'available', CURRENT_DATE, 'Updated 2-bedroom with 2 full bathrooms. In-unit washer/dryer.', (SELECT id FROM profiles LIMIT 1), 'voucher'),
  
  -- Property 7: Standard 2BR
  ('5194 Coney Island Avenue, Brooklyn, NY 11218', '5194 Coney Island Avenue', 'Brooklyn', 'NY', '11218', 2, 1.5, 900, 1950, 'available', CURRENT_DATE + INTERVAL '10 days', '2-bedroom with 1.5 baths. Close to parks and shopping. Available December 1st.', (SELECT id FROM profiles LIMIT 1), 'market_rate'),
  
  -- Property 8: Luxury 4BR
  ('9257 Shore Parkway, Brooklyn, NY 11214', '9257 Shore Parkway', 'Brooklyn', 'NY', '11214', 4, 3, 1800, 2800, 'available', CURRENT_DATE + INTERVAL '45 days', 'Luxury 4-bedroom house with 3 bathrooms. Rooftop deck included.', (SELECT id FROM profiles LIMIT 1), 'market_rate');