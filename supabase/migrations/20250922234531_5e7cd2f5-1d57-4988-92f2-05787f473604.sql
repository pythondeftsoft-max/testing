-- Insert sample open maintenance requests with proper tenant associations
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
) 
SELECT 
  gen_random_uuid(),
  nextval('maintenance_task_id_seq')::TEXT,
  p.id,
  COALESCE(pa.tenant_id, (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1)),
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
FROM properties p
LEFT JOIN property_applications pa ON p.id = pa.property_id AND pa.status = 'approved'
LIMIT 1

UNION ALL

SELECT 
  gen_random_uuid(),
  nextval('maintenance_task_id_seq')::TEXT,
  p.id,
  COALESCE(pa.tenant_id, (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1)),
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
FROM properties p
LEFT JOIN property_applications pa ON p.id = pa.property_id AND pa.status = 'approved'
LIMIT 1

UNION ALL

SELECT 
  gen_random_uuid(),
  nextval('maintenance_task_id_seq')::TEXT,
  p.id,
  COALESCE(pa.tenant_id, (SELECT id FROM profiles WHERE user_type = 'tenant' LIMIT 1)),
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
FROM properties p
LEFT JOIN property_applications pa ON p.id = pa.property_id AND pa.status = 'approved'
LIMIT 1;