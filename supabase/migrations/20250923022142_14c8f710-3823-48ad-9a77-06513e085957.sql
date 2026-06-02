-- Add comprehensive sample maintenance requests data using actual IDs

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
 '020ce147-6e30-4f34-9f04-6fad580f1d50', 
 '0aa18055-5baf-40d1-8f36-01096b491874', 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '2 days', 
 NOW() + INTERVAL '1 day',
 '386d655c-9c41-407c-84b6-443be39de242',
 250.00,
 NOW() - INTERVAL '2 days'
),

('Bathroom Toilet Clog', 'Toilet in main bathroom is completely clogged and overflowing', 'plumbing', 'high', 'in_progress',
 '0729102c-387f-4957-863f-75868e2a7573', 
 'e550816b-7c4c-4197-9217-dfa8882262e6', 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1 OFFSET 1),
 NOW() - INTERVAL '1 day', 
 NOW() + INTERVAL '2 days',
 'f8437559-6f99-4cfc-9bc4-75bcf6024189',
 180.00,
 NOW() - INTERVAL '1 day'
),

-- Electrical issues
('Living Room Light Switch Not Working', 'Main light switch in living room stopped working, no power to overhead lights', 'electrical', 'medium', 'pending',
 '08fba6b3-3b34-4726-a727-51b971886a1a', 
 '503bb895-8a1e-4690-bebd-6bf6ac47fc3e', 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1 OFFSET 2),
 NOW() - INTERVAL '3 days', 
 NOW() + INTERVAL '3 days',
 'd1f6b11c-fa56-4875-83d4-bb2344ec4f1b',
 150.00,
 NOW() - INTERVAL '3 days'
),

('Kitchen Outlet Not Working', 'GFCI outlet in kitchen keeps tripping, appliances not working', 'electrical', 'high', 'in_progress',
 '091d489d-e17b-49b8-9f30-aab96e0e585c', 
 'dd4a3938-8063-44f2-8579-0e3efdaa0f88', 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '4 days', 
 NOW() - INTERVAL '1 day',
 '44beabaf-5ce6-4093-90bc-e2df59db15ac',
 200.00,
 NOW() - INTERVAL '4 days'
),

-- HVAC issues
('Air Conditioning Not Cooling', 'AC unit running but not producing cold air, very hot in apartment', 'hvac', 'high', 'pending',
 '0c8708e7-5293-45ac-8b94-202b915fe9ae', 
 'd3a6d098-f7f2-4c3c-89eb-ece50ada399c', 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1 OFFSET 1),
 NOW() - INTERVAL '1 day', 
 NOW() + INTERVAL '1 day',
 '386d655c-9c41-407c-84b6-443be39de242',
 350.00,
 NOW() - INTERVAL '1 day'
),

('Heater Making Strange Noise', 'Furnace making loud banging noises when turning on', 'hvac', 'medium', 'pending',
 '020ce147-6e30-4f34-9f04-6fad580f1d50', 
 '0aa18055-5baf-40d1-8f36-01096b491874', 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '5 days', 
 NOW() + INTERVAL '2 days',
 NULL,
 300.00,
 NOW() - INTERVAL '5 days'
),

-- Appliance repair
('Dishwasher Not Draining', 'Water standing in bottom of dishwasher after cycle completes', 'appliance_repair', 'medium', 'in_progress',
 '0729102c-387f-4957-863f-75868e2a7573', 
 'e550816b-7c4c-4197-9217-dfa8882262e6', 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1 OFFSET 1),
 NOW() - INTERVAL '6 days', 
 NOW() + INTERVAL '1 day',
 'f8437559-6f99-4cfc-9bc4-75bcf6024189',
 220.00,
 NOW() - INTERVAL '6 days'
),

-- Painting issues  
('Bedroom Wall Water Damage', 'Paint peeling on bedroom wall due to water leak, needs repainting', 'painting', 'low', 'pending',
 '08fba6b3-3b34-4726-a727-51b971886a1a', 
 '503bb895-8a1e-4690-bebd-6bf6ac47fc3e', 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1 OFFSET 2),
 NOW() - INTERVAL '7 days', 
 NOW() + INTERVAL '7 days',
 'd1f6b11c-fa56-4875-83d4-bb2344ec4f1b',
 120.00,
 NOW() - INTERVAL '7 days'
),

-- General handyman
('Bathroom Door Handle Broken', 'Door handle fell off bathroom door, cannot close door properly', 'general_handyman', 'medium', 'pending',
 '091d489d-e17b-49b8-9f30-aab96e0e585c', 
 'dd4a3938-8063-44f2-8579-0e3efdaa0f88', 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '3 days', 
 NOW() + INTERVAL '4 days',
 '44beabaf-5ce6-4093-90bc-e2df59db15ac',
 75.00,
 NOW() - INTERVAL '3 days'
),

-- Pest control
('Ant Infestation in Kitchen', 'Large number of ants found in kitchen area, need pest control treatment', 'pest_control', 'medium', 'in_progress',
 '0c8708e7-5293-45ac-8b94-202b915fe9ae', 
 'd3a6d098-f7f2-4c3c-89eb-ece50ada399c', 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1 OFFSET 1),
 NOW() - INTERVAL '4 days', 
 NOW() + INTERVAL '2 days',
 '386d655c-9c41-407c-84b6-443be39de242',
 160.00,
 NOW() - INTERVAL '4 days'
),

-- Cleaning and Security systems
('Post-Move-Out Deep Clean', 'Unit needs thorough cleaning after tenant move-out before new tenant', 'cleaning', 'low', 'pending',
 '020ce147-6e30-4f34-9f04-6fad580f1d50', 
 '0aa18055-5baf-40d1-8f36-01096b491874', 
 NULL,
 NOW() - INTERVAL '5 days', 
 NOW() + INTERVAL '5 days',
 'f8437559-6f99-4cfc-9bc4-75bcf6024189',
 300.00,
 NOW() - INTERVAL '5 days'
),

('Entry Keypad Malfunction', 'Building entry keypad not accepting correct codes', 'security_systems', 'high', 'pending',
 '0729102c-387f-4957-863f-75868e2a7573', 
 NULL,
 NULL,
 NOW() - INTERVAL '1 day', 
 NOW() + INTERVAL '1 day',
 'd1f6b11c-fa56-4875-83d4-bb2344ec4f1b',
 180.00,
 NOW() - INTERVAL '1 day'
);