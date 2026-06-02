-- Add sample maintenance requests with correct table references

-- Insert sample maintenance requests
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
  estimated_cost
) VALUES
-- Use existing properties and create simpler sample data
('Kitchen Sink Leak', 'Water leaking from kitchen sink faucet, requires immediate attention', 'plumbing', 'high', 'pending', 
 (SELECT id FROM properties LIMIT 1), 
 (SELECT id FROM property_units LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '2 days', 
 NOW() + INTERVAL '1 day',
 250.00
),

('Bathroom Toilet Clog', 'Toilet in main bathroom is completely clogged', 'plumbing', 'high', 'in_progress',
 (SELECT id FROM properties LIMIT 1), 
 (SELECT id FROM property_units OFFSET 1 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '1 day', 
 NOW() + INTERVAL '2 days',
 180.00
),

('Light Switch Not Working', 'Main light switch in living room stopped working', 'electrical', 'medium', 'pending',
 (SELECT id FROM properties LIMIT 1), 
 (SELECT id FROM property_units OFFSET 2 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '3 days', 
 NOW() + INTERVAL '3 days',
 150.00
),

('AC Not Cooling', 'AC unit running but not producing cold air', 'hvac', 'high', 'pending',
 (SELECT id FROM properties LIMIT 1), 
 (SELECT id FROM property_units OFFSET 3 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '1 day', 
 NOW() + INTERVAL '1 day',
 350.00
),

('Dishwasher Not Draining', 'Water standing in bottom of dishwasher', 'appliance_repair', 'medium', 'in_progress',
 (SELECT id FROM properties LIMIT 1), 
 (SELECT id FROM property_units LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '6 days', 
 NOW() + INTERVAL '1 day',
 220.00
),

('Wall Water Damage', 'Paint peeling on bedroom wall, needs repainting', 'painting', 'low', 'pending',
 (SELECT id FROM properties LIMIT 1), 
 (SELECT id FROM property_units OFFSET 4 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '7 days', 
 NOW() + INTERVAL '7 days',
 120.00
),

('Carpet Stain', 'Large stain on carpet needs professional cleaning', 'flooring', 'low', 'pending',
 (SELECT id FROM properties LIMIT 1), 
 (SELECT id FROM property_units OFFSET 5 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '8 days', 
 NOW() + INTERVAL '10 days',
 400.00
),

('Door Handle Broken', 'Door handle fell off bathroom door', 'general_handyman', 'medium', 'pending',
 (SELECT id FROM properties LIMIT 1), 
 (SELECT id FROM property_units OFFSET 6 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '3 days', 
 NOW() + INTERVAL '4 days',
 75.00
),

('Ant Infestation', 'Large number of ants in kitchen area', 'pest_control', 'medium', 'in_progress',
 (SELECT id FROM properties LIMIT 1), 
 (SELECT id FROM property_units OFFSET 7 LIMIT 1), 
 (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
 NOW() - INTERVAL '4 days', 
 NOW() + INTERVAL '2 days',
 160.00
),

('Deep Clean Needed', 'Unit needs thorough cleaning after tenant move-out', 'cleaning', 'low', 'pending',
 (SELECT id FROM properties LIMIT 1), 
 (SELECT id FROM property_units OFFSET 8 LIMIT 1), 
 NULL,
 NOW() - INTERVAL '5 days', 
 NOW() + INTERVAL '5 days',
 300.00
);