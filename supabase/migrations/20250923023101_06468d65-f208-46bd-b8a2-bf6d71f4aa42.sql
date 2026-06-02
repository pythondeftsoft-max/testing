-- Clean up invalid maintenance requests that reference non-existent properties
DELETE FROM maintenance_requests 
WHERE property_id = '020ce147-6e30-4f34-9f04-6fad580f1d50'
   OR property_id NOT IN (SELECT id FROM properties WHERE deleted_at IS NULL);

-- Insert realistic sample maintenance requests using actual property, unit, tenant, and vendor data
INSERT INTO maintenance_requests (
  property_id,
  unit_id,
  tenant_id,
  title,
  description,
  category,
  priority,
  status,
  assigned_vendor_id,
  submitted_date,
  due_date,
  created_at,
  updated_at
) VALUES 
-- High priority plumbing issues
(
  (SELECT id FROM properties WHERE address LIKE '%Oak Street%' LIMIT 1),
  (SELECT pu.id FROM property_units pu JOIN properties p ON pu.property_id = p.id WHERE p.address LIKE '%Oak Street%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
  'Kitchen Sink Leak - Urgent',
  'Major leak under kitchen sink, water damage spreading to floor. Tenant reports water pooling and cabinet damage.',
  'plumbing',
  'high',
  'pending',
  (SELECT id FROM maintenance_vendors WHERE 'plumbing' = ANY(specialties) LIMIT 1),
  NOW() - INTERVAL '2 hours',
  NOW() + INTERVAL '24 hours',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
),
(
  (SELECT id FROM properties WHERE address LIKE '%Maple%' LIMIT 1),
  (SELECT pu.id FROM property_units pu JOIN properties p ON pu.property_id = p.id WHERE p.address LIKE '%Maple%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at LIMIT 1 OFFSET 1),
  'Toilet Overflow Issue',
  'Toilet continuously overflowing, flooding bathroom floor. Needs immediate attention.',
  'plumbing',
  'high',
  'in_progress',
  (SELECT id FROM maintenance_vendors WHERE 'plumbing' = ANY(specialties) LIMIT 1),
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '12 hours',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '6 hours'
),

-- Medium priority electrical issues
(
  (SELECT id FROM properties WHERE address LIKE '%Pine%' LIMIT 1),
  (SELECT pu.id FROM property_units pu JOIN properties p ON pu.property_id = p.id WHERE p.address LIKE '%Pine%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at LIMIT 1 OFFSET 2),
  'Flickering Lights in Living Room',
  'All lights in living room flickering intermittently. May be wiring issue or circuit breaker problem.',
  'electrical',
  'medium',
  'pending',
  (SELECT id FROM maintenance_vendors WHERE 'electrical' = ANY(specialties) LIMIT 1),
  NOW() - INTERVAL '3 days',
  NOW() + INTERVAL '3 days',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
),
(
  (SELECT id FROM properties WHERE address LIKE '%Elm%' LIMIT 1),
  (SELECT pu.id FROM property_units pu JOIN properties p ON pu.property_id = p.id WHERE p.address LIKE '%Elm%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at LIMIT 1 OFFSET 3),
  'Outlet Not Working in Bedroom',
  'Master bedroom outlet completely dead. No power to lamps or phone chargers.',
  'electrical',
  'medium',
  'pending',
  NULL, -- Unassigned
  NOW() - INTERVAL '2 days',
  NOW() + INTERVAL '5 days',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),

-- HVAC issues
(
  (SELECT id FROM properties WHERE address LIKE '%Diamond%' LIMIT 1),
  (SELECT pu.id FROM property_units pu JOIN properties p ON pu.property_id = p.id WHERE p.address LIKE '%Diamond%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at LIMIT 1 OFFSET 4),
  'AC Unit Not Cooling Properly',
  'Air conditioning running but not cooling. Room temperature stays around 80°F despite thermostat set to 72°F.',
  'hvac',
  'medium',
  'in_progress',
  (SELECT id FROM maintenance_vendors WHERE 'hvac' = ANY(specialties) LIMIT 1),
  NOW() - INTERVAL '4 days',
  NOW() + INTERVAL '2 days',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '1 day'
),
(
  (SELECT id FROM properties WHERE address LIKE '%Monteith%' LIMIT 1),
  (SELECT pu.id FROM property_units pu JOIN properties p ON pu.property_id = p.id WHERE p.address LIKE '%Monteith%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
  'Heating System Making Strange Noises',
  'Furnace making loud banging and grinding noises when starting up. Concerned about safety.',
  'hvac',
  'high',
  'pending',
  (SELECT id FROM maintenance_vendors WHERE 'hvac' = ANY(specialties) LIMIT 1),
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '24 hours',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),

-- Appliance repair issues
(
  (SELECT id FROM properties WHERE address LIKE '%River%' LIMIT 1),
  (SELECT pu.id FROM property_units pu JOIN properties p ON pu.property_id = p.id WHERE p.address LIKE '%River%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at LIMIT 1 OFFSET 1),
  'Dishwasher Not Draining',
  'Dishwasher fills with water but won''t drain. Standing water at bottom after cycle completes.',
  'appliance_repair',
  'medium',
  'pending',
  NULL, -- Unassigned
  NOW() - INTERVAL '5 days',
  NOW() + INTERVAL '7 days',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '5 days'
),
(
  (SELECT id FROM properties WHERE address LIKE '%Student%' LIMIT 1),
  (SELECT pu.id FROM property_units pu JOIN properties p ON pu.property_id = p.id WHERE p.address LIKE '%Student%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at LIMIT 1 OFFSET 2),
  'Refrigerator Temperature Issues',
  'Fridge not maintaining cold temperature. Food spoiling and freezer section not freezing properly.',
  'appliance_repair',
  'high',
  'pending',
  NULL, -- Unassigned
  NOW() - INTERVAL '12 hours',
  NOW() + INTERVAL '48 hours',
  NOW() - INTERVAL '12 hours',
  NOW() - INTERVAL '12 hours'
),

-- General maintenance and other categories
(
  (SELECT id FROM properties WHERE address LIKE '%Park West%' LIMIT 1),
  (SELECT pu.id FROM property_units pu JOIN properties p ON pu.property_id = p.id WHERE p.address LIKE '%Park West%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at LIMIT 1 OFFSET 3),
  'Sticky Front Door Lock',
  'Front door lock very difficult to turn, key gets stuck. Concerned about getting locked out.',
  'general_handyman',
  'low',
  'pending',
  (SELECT id FROM maintenance_vendors WHERE 'general_handyman' = ANY(specialties) LIMIT 1),
  NOW() - INTERVAL '6 days',
  NOW() + INTERVAL '10 days',
  NOW() - INTERVAL '6 days',
  NOW() - INTERVAL '6 days'
),
(
  (SELECT id FROM properties WHERE address LIKE '%Skyline%' LIMIT 1),
  (SELECT pu.id FROM property_units pu JOIN properties p ON pu.property_id = p.id WHERE p.address LIKE '%Skyline%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at LIMIT 1 OFFSET 4),
  'Bathroom Tile Repair Needed',
  'Several bathroom tiles are loose and one has fallen off the wall. Grout is cracking in multiple places.',
  'flooring',
  'medium',
  'pending',
  NULL, -- Unassigned
  NOW() - INTERVAL '8 days',
  NOW() + INTERVAL '14 days',
  NOW() - INTERVAL '8 days',
  NOW() - INTERVAL '8 days'
),

-- More varied requests for better testing
(
  (SELECT id FROM properties WHERE address LIKE '%Oak%' LIMIT 1),
  (SELECT pu.id FROM property_units pu JOIN properties p ON pu.property_id = p.id WHERE p.address LIKE '%Oak%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at LIMIT 1 OFFSET 1),
  'Pest Control - Ant Problem',
  'Large number of ants in kitchen area, especially around sink and food storage areas.',
  'pest_control',
  'medium',
  'pending',
  NULL, -- Unassigned
  NOW() - INTERVAL '3 days',
  NOW() + INTERVAL '7 days',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
),
(
  (SELECT id FROM properties WHERE address LIKE '%Maple%' LIMIT 1),
  (SELECT pu.id FROM property_units pu JOIN properties p ON pu.property_id = p.id WHERE p.address LIKE '%Maple%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at LIMIT 1 OFFSET 2),
  'Window Won''t Close Properly',
  'Living room window won''t close completely, leaving gap that lets in cold air.',
  'general_handyman',
  'low',
  'in_progress',
  (SELECT id FROM maintenance_vendors WHERE 'general_handyman' = ANY(specialties) LIMIT 1),
  NOW() - INTERVAL '7 days',
  NOW() + INTERVAL '3 days',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '2 days'
),
(
  (SELECT id FROM properties WHERE address LIKE '%Pine%' LIMIT 1),
  (SELECT pu.id FROM property_units pu JOIN properties p ON pu.property_id = p.id WHERE p.address LIKE '%Pine%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at LIMIT 1 OFFSET 3),
  'Smoke Detector Chirping',
  'Bedroom smoke detector chirping every few minutes, likely needs battery replacement.',
  'electrical',
  'low',
  'pending',
  (SELECT id FROM maintenance_vendors WHERE 'electrical' = ANY(specialties) LIMIT 1),
  NOW() - INTERVAL '1 day',
  NOW() + INTERVAL '7 days',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),
(
  (SELECT id FROM properties WHERE address LIKE '%Elm%' LIMIT 1),
  (SELECT pu.id FROM property_units pu JOIN properties p ON pu.property_id = p.id WHERE p.address LIKE '%Elm%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' ORDER BY created_at LIMIT 1 OFFSET 4),
  'Garbage Disposal Jammed',
  'Kitchen garbage disposal completely jammed, making grinding noise but not working.',
  'plumbing',
  'medium',
  'pending',
  NULL, -- Unassigned
  NOW() - INTERVAL '2 days',
  NOW() + INTERVAL '5 days',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),
(
  (SELECT id FROM properties WHERE address LIKE '%Diamond%' LIMIT 1),
  (SELECT pu.id FROM property_units pu JOIN properties p ON pu.property_id = p.id WHERE p.address LIKE '%Diamond%' LIMIT 1),
  (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1),
  'Ceiling Fan Wobbling',
  'Master bedroom ceiling fan wobbles violently when running, making loud noise.',
  'electrical',
  'medium',
  'pending',
  (SELECT id FROM maintenance_vendors WHERE 'electrical' = ANY(specialties) LIMIT 1),
  NOW() - INTERVAL '4 days',
  NOW() + INTERVAL '6 days',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '4 days'
);