-- Insert sample open maintenance requests for testing the Open Tasks Report
INSERT INTO public.maintenance_requests (
  id,
  task_id,
  property_id,
  unit_id,
  title,
  description,
  category,
  priority,
  status,
  submitted_date,
  due_date,
  estimated_cost,
  assigned_vendor_id
) VALUES 
  -- Sample pending request #1
  (
    gen_random_uuid(),
    nextval('maintenance_task_id_seq')::TEXT,
    (SELECT id FROM properties LIMIT 1),
    NULL,
    'Fix Leaking Faucet',
    'Kitchen faucet has been dripping constantly. Needs immediate attention.',
    'Plumbing',
    'high',
    'pending',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE + INTERVAL '2 days',
    150.00,
    (SELECT id FROM maintenance_vendors LIMIT 1)
  ),
  -- Sample in_progress request #2
  (
    gen_random_uuid(),
    nextval('maintenance_task_id_seq')::TEXT,
    (SELECT id FROM properties LIMIT 1),
    NULL,
    'HVAC System Maintenance',
    'Annual HVAC system inspection and filter replacement.',
    'HVAC',
    'medium',
    'in_progress',
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '7 days',
    300.00,
    (SELECT id FROM maintenance_vendors LIMIT 1)
  ),
  -- Sample pending request #3
  (
    gen_random_uuid(),
    nextval('maintenance_task_id_seq')::TEXT,
    (SELECT id FROM properties ORDER BY id LIMIT 1 OFFSET 1),
    NULL,
    'Broken Window Repair',
    'Bedroom window glass cracked during storm. Safety hazard.',
    'General Maintenance',
    'high',
    'pending',
    CURRENT_DATE - INTERVAL '1 day',
    CURRENT_DATE + INTERVAL '3 days',
    250.00,
    NULL
  ),
  -- Sample in_progress request #4
  (
    gen_random_uuid(),
    nextval('maintenance_task_id_seq')::TEXT,
    (SELECT id FROM properties ORDER BY id LIMIT 1 OFFSET 1),
    NULL,
    'Garage Door Motor Replacement',
    'Garage door opener motor has failed. Replacement needed.',
    'Electrical',
    'medium',
    'in_progress',
    CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '5 days',
    450.00,
    (SELECT id FROM maintenance_vendors ORDER BY id LIMIT 1 OFFSET 1)
  );