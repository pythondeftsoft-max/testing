-- Insert sample open maintenance requests with proper tenant associations
WITH sample_tenant AS (
  SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1
),
sample_vendor AS (
  SELECT id FROM maintenance_vendors LIMIT 1
),
sample_property AS (
  SELECT id FROM properties LIMIT 1
)
INSERT INTO public.maintenance_requests (
  id,
  task_id,
  property_id,
  tenant_id,
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
    (SELECT id FROM sample_property),
    (SELECT id FROM sample_tenant),
    NULL,
    'Fix Leaking Faucet',
    'Kitchen faucet has been dripping constantly. Needs immediate attention.',
    'Plumbing',
    'high',
    'pending',
    CURRENT_DATE - INTERVAL '3 days',
    CURRENT_DATE + INTERVAL '2 days',
    150.00,
    (SELECT id FROM sample_vendor)
  ),
  -- Sample in_progress request #2
  (
    gen_random_uuid(),
    nextval('maintenance_task_id_seq')::TEXT,
    (SELECT id FROM sample_property),
    (SELECT id FROM sample_tenant),
    NULL,
    'HVAC System Maintenance',
    'Annual HVAC system inspection and filter replacement.',
    'HVAC',
    'medium',
    'in_progress',
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '7 days',
    300.00,
    (SELECT id FROM sample_vendor)
  ),
  -- Sample pending request #3
  (
    gen_random_uuid(),
    nextval('maintenance_task_id_seq')::TEXT,
    (SELECT id FROM sample_property),
    (SELECT id FROM sample_tenant),
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
  );