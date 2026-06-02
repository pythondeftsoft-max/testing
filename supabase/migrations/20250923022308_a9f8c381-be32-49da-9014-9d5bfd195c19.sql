-- Add simple sample maintenance requests data

-- First get some data for reference
DO $$
DECLARE
  first_property_id UUID;
  first_unit_id UUID;
  first_tenant_id UUID;
BEGIN
  -- Get first property
  SELECT id INTO first_property_id FROM properties LIMIT 1;
  
  -- Get first property unit (if exists)
  SELECT id INTO first_unit_id FROM property_units LIMIT 1;
  
  -- Get first tenant (if exists)
  SELECT id INTO first_tenant_id FROM profiles WHERE user_type = 'tenant' LIMIT 1;
  
  -- Only proceed if we have a property
  IF first_property_id IS NOT NULL THEN
    -- Insert sample maintenance requests using available data
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
    -- Use first tenant for all requests (since tenant_id is required)
    ('Kitchen Sink Leak', 'Water leaking from kitchen sink faucet', 'plumbing', 'high', 'pending', 
     first_property_id, first_unit_id, first_tenant_id,
     NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 day', 250.00
    ),
    
    ('Light Switch Issue', 'Light switch not working in bedroom', 'electrical', 'medium', 'pending',
     first_property_id, first_unit_id, first_tenant_id,
     NOW() - INTERVAL '3 days', NOW() + INTERVAL '3 days', 150.00
    ),
    
    ('AC Not Cooling', 'Air conditioning not producing cold air', 'hvac', 'high', 'in_progress',
     first_property_id, first_unit_id, first_tenant_id,
     NOW() - INTERVAL '1 day', NOW() + INTERVAL '1 day', 350.00
    ),
    
    ('Dishwasher Problem', 'Dishwasher not draining properly', 'appliance_repair', 'medium', 'pending',
     first_property_id, first_unit_id, first_tenant_id,
     NOW() - INTERVAL '4 days', NOW() + INTERVAL '2 days', 220.00
    ),
    
    ('Wall Paint Damage', 'Paint peeling on bedroom wall', 'painting', 'low', 'pending',
     first_property_id, first_unit_id, first_tenant_id,
     NOW() - INTERVAL '7 days', NOW() + INTERVAL '7 days', 120.00
    ),
    
    ('Door Handle Broken', 'Bathroom door handle needs repair', 'general_handyman', 'medium', 'pending',
     first_property_id, first_unit_id, first_tenant_id,
     NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', 75.00
    ),
    
    ('Pest Issue', 'Ants found in kitchen area', 'pest_control', 'medium', 'in_progress',
     first_property_id, first_unit_id, first_tenant_id,
     NOW() - INTERVAL '4 days', NOW() + INTERVAL '2 days', 160.00
    ),
    
    ('Carpet Cleaning', 'Carpet needs professional cleaning', 'cleaning', 'low', 'pending',
     first_property_id, first_unit_id, first_tenant_id,
     NOW() - INTERVAL '5 days', NOW() + INTERVAL '5 days', 300.00
    );
  END IF;
END $$;