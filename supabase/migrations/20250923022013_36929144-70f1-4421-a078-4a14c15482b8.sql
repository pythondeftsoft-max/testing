-- Add comprehensive sample maintenance requests data with correct column names

-- Insert sample maintenance requests with proper categories
INSERT INTO maintenance_requests (
  title,
  description,
  category,
  priority,
  status,
  property_id,
  unit_id,
  tenant_id,
  submitted_date,
  due_date,
  assigned_vendor_id,
  estimated_cost,
  created_at
) VALUES
-- Plumbing issues
('Kitchen Sink Leak', 'Water leaking from kitchen sink faucet, requires immediate attention', 'plumbing', 'high', 'pending', 
 (SELECT id FROM properties LIMIT 1), 
 (SELECT id FROM units LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '2 days', 
 NOW() + INTERVAL '1 day',
 (SELECT id FROM maintenance_vendors LIMIT 1),
 250.00,
 NOW() - INTERVAL '2 days'
),

('Bathroom Toilet Clog', 'Toilet in main bathroom is completely clogged and overflowing', 'plumbing', 'high', 'in_progress',
 (SELECT id FROM properties OFFSET 1 LIMIT 1), 
 (SELECT id FROM units OFFSET 1 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' OFFSET 1 LIMIT 1),
 NOW() - INTERVAL '1 day', 
 NOW() + INTERVAL '2 days',
 (SELECT id FROM maintenance_vendors LIMIT 1),
 180.00,
 NOW() - INTERVAL '1 day'
),

-- Electrical issues
('Living Room Light Switch Not Working', 'Main light switch in living room stopped working, no power to overhead lights', 'electrical', 'medium', 'pending',
 (SELECT id FROM properties OFFSET 2 LIMIT 1), 
 (SELECT id FROM units OFFSET 2 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' OFFSET 2 LIMIT 1),
 NOW() - INTERVAL '3 days', 
 NOW() + INTERVAL '3 days',
 (SELECT id FROM maintenance_vendors OFFSET 1 LIMIT 1),
 150.00,
 NOW() - INTERVAL '3 days'
),

('Kitchen Outlet Not Working', 'GFCI outlet in kitchen keeps tripping, appliances not working', 'electrical', 'high', 'in_progress',
 (SELECT id FROM properties LIMIT 1), 
 (SELECT id FROM units OFFSET 3 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '4 days', 
 NOW() - INTERVAL '1 day',
 (SELECT id FROM maintenance_vendors OFFSET 1 LIMIT 1),
 200.00,
 NOW() - INTERVAL '4 days'
),

-- HVAC issues
('Air Conditioning Not Cooling', 'AC unit running but not producing cold air, very hot in apartment', 'hvac', 'high', 'pending',
 (SELECT id FROM properties OFFSET 1 LIMIT 1), 
 (SELECT id FROM units OFFSET 4 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' OFFSET 1 LIMIT 1),
 NOW() - INTERVAL '1 day', 
 NOW() + INTERVAL '1 day',
 (SELECT id FROM maintenance_vendors OFFSET 2 LIMIT 1),
 350.00,
 NOW() - INTERVAL '1 day'
),

('Heater Making Strange Noise', 'Furnace making loud banging noises when turning on', 'hvac', 'medium', 'pending',
 (SELECT id FROM properties OFFSET 2 LIMIT 1), 
 (SELECT id FROM units OFFSET 5 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' OFFSET 2 LIMIT 1),
 NOW() - INTERVAL '5 days', 
 NOW() + INTERVAL '2 days',
 NULL,
 300.00,
 NOW() - INTERVAL '5 days'
),

-- Appliance repair
('Dishwasher Not Draining', 'Water standing in bottom of dishwasher after cycle completes', 'appliance_repair', 'medium', 'in_progress',
 (SELECT id FROM properties LIMIT 1), 
 (SELECT id FROM units LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '6 days', 
 NOW() + INTERVAL '1 day',
 (SELECT id FROM maintenance_vendors OFFSET 3 LIMIT 1),
 220.00,
 NOW() - INTERVAL '6 days'
),

('Refrigerator Temperature Issues', 'Fridge not keeping food cold, freezer section working fine', 'appliance_repair', 'high', 'pending',
 (SELECT id FROM properties OFFSET 3 LIMIT 1), 
 (SELECT id FROM units OFFSET 6 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' OFFSET 3 LIMIT 1),
 NOW() - INTERVAL '2 days', 
 NOW() + INTERVAL '1 day',
 NULL,
 280.00,
 NOW() - INTERVAL '2 days'
),

-- Painting issues  
('Bedroom Wall Water Damage', 'Paint peeling on bedroom wall due to water leak, needs repainting', 'painting', 'low', 'pending',
 (SELECT id FROM properties OFFSET 1 LIMIT 1), 
 (SELECT id FROM units OFFSET 7 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' OFFSET 1 LIMIT 1),
 NOW() - INTERVAL '7 days', 
 NOW() + INTERVAL '7 days',
 (SELECT id FROM maintenance_vendors OFFSET 4 LIMIT 1),
 120.00,
 NOW() - INTERVAL '7 days'
),

-- Flooring issues
('Living Room Carpet Stain', 'Large stain on carpet that needs professional cleaning or replacement', 'flooring', 'low', 'pending',
 (SELECT id FROM properties OFFSET 2 LIMIT 1), 
 (SELECT id FROM units OFFSET 8 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' OFFSET 2 LIMIT 1),
 NOW() - INTERVAL '8 days', 
 NOW() + INTERVAL '10 days',
 NULL,
 400.00,
 NOW() - INTERVAL '8 days'
),

-- General handyman
('Bathroom Door Handle Broken', 'Door handle fell off bathroom door, cannot close door properly', 'general_handyman', 'medium', 'pending',
 (SELECT id FROM properties OFFSET 3 LIMIT 1), 
 (SELECT id FROM units OFFSET 9 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' OFFSET 3 LIMIT 1),
 NOW() - INTERVAL '3 days', 
 NOW() + INTERVAL '4 days',
 (SELECT id FROM maintenance_vendors LIMIT 1),
 75.00,
 NOW() - INTERVAL '3 days'
),

-- Pest control
('Ant Infestation in Kitchen', 'Large number of ants found in kitchen area, need pest control treatment', 'pest_control', 'medium', 'in_progress',
 (SELECT id FROM properties LIMIT 1), 
 (SELECT id FROM units OFFSET 10 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '4 days', 
 NOW() + INTERVAL '2 days',
 (SELECT id FROM maintenance_vendors OFFSET 5 LIMIT 1),
 160.00,
 NOW() - INTERVAL '4 days'
),

-- Cleaning
('Post-Move-Out Deep Clean', 'Unit needs thorough cleaning after tenant move-out before new tenant', 'cleaning', 'low', 'pending',
 (SELECT id FROM properties OFFSET 1 LIMIT 1), 
 (SELECT id FROM units OFFSET 11 LIMIT 1), 
 NULL,
 NOW() - INTERVAL '5 days', 
 NOW() + INTERVAL '5 days',
 (SELECT id FROM maintenance_vendors OFFSET 6 LIMIT 1),
 300.00,
 NOW() - INTERVAL '5 days'
),

-- Landscaping  
('Front Yard Sprinkler Broken', 'Sprinkler head broken in front yard area, grass dying', 'landscaping', 'low', 'pending',
 (SELECT id FROM properties OFFSET 2 LIMIT 1), 
 NULL,
 (SELECT id FROM profiles WHERE user_type = 'tenant' OFFSET 2 LIMIT 1),
 NOW() - INTERVAL '9 days', 
 NOW() + INTERVAL '14 days',
 NULL,
 95.00,
 NOW() - INTERVAL '9 days'
),

-- Security systems
('Entry Keypad Malfunction', 'Building entry keypad not accepting correct codes', 'security_systems', 'high', 'pending',
 (SELECT id FROM properties OFFSET 3 LIMIT 1), 
 NULL,
 NULL,
 NOW() - INTERVAL '1 day', 
 NOW() + INTERVAL '1 day',
 (SELECT id FROM maintenance_vendors OFFSET 7 LIMIT 1),
 180.00,
 NOW() - INTERVAL '1 day'
),

-- Roofing
('Roof Leak in Attic', 'Water stains appearing on ceiling, possible roof leak', 'roofing', 'high', 'in_progress',
 (SELECT id FROM properties LIMIT 1), 
 NULL,
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '6 days', 
 NOW() + INTERVAL '2 days',
 (SELECT id FROM maintenance_vendors OFFSET 8 LIMIT 1),
 850.00,
 NOW() - INTERVAL '6 days'
);