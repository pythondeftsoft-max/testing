-- Insert sample maintenance requests for testing Open Tasks Report
INSERT INTO maintenance_requests (
  id,
  task_id,
  property_id,
  unit_id,
  tenant_id,
  title,
  description,
  category,
  priority,
  status,
  submitted_date,
  due_date,
  estimated_cost
) VALUES 
-- Sample for property: 123 Main Interest Street
(
  gen_random_uuid(),
  'MR-2024-001',
  '5a65574e-ffda-4034-917f-f402b2bd3430',
  'd9390797-56e0-43a6-9616-3e96e1d16ebb',
  'ccb8536c-80d1-4834-9614-169b9a7caede',
  'Kitchen Sink Leak',
  'Tenant reports water leak under kitchen sink. Needs immediate attention.',
  'Plumbing',
  'high',
  'pending',
  NOW() - INTERVAL '3 days',
  NOW() + INTERVAL '2 days',
  150.00
),
-- Sample for property: 127 Test est est
(
  gen_random_uuid(),
  'MR-2024-002',
  '83bbf428-7634-4e6b-9022-48eaa5ad09be',
  'aec7340b-80ac-4cb9-8d85-5b1785edc049',
  'ccb8536c-80d1-4834-9614-169b9a7caede',
  'HVAC System Not Heating',
  'Unit is not getting proper heat. Temperature consistently low despite thermostat settings.',
  'HVAC',
  'high',
  'in_progress',
  NOW() - INTERVAL '5 days',
  NOW() + INTERVAL '1 day',
  300.00
),
-- Additional sample without specific unit
(
  gen_random_uuid(),
  'MR-2024-003',
  '5a65574e-ffda-4034-917f-f402b2bd3430',
  NULL,
  'ccb8536c-80d1-4834-9614-169b9a7caede',
  'Exterior Paint Touch-up',
  'Front entrance needs paint touch-up due to weather damage.',
  'Paint/Touch-up',
  'medium',
  'pending',
  NOW() - INTERVAL '7 days',
  NOW() + INTERVAL '14 days',
  200.00
),
-- Overdue task
(
  gen_random_uuid(),
  'MR-2024-004',
  '83bbf428-7634-4e6b-9022-48eaa5ad09be',
  NULL,
  'ccb8536c-80d1-4834-9614-169b9a7caede',
  'Broken Window Repair',
  'Broken window in common area needs replacement.',
  'General Maintenance',
  'medium',
  'pending',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '2 days',
  125.00
),
-- Long running task
(
  gen_random_uuid(),
  'MR-2024-005',
  '5a65574e-ffda-4034-917f-f402b2bd3430',
  'd9390797-56e0-43a6-9616-3e96e1d16ebb',
  'ccb8536c-80d1-4834-9614-169b9a7caede',
  'Electrical Outlet Not Working',
  'Bedroom outlet stopped working. May need electrician to inspect wiring.',
  'Electrical',
  'low',
  'in_progress',
  NOW() - INTERVAL '15 days',
  NOW() + INTERVAL '7 days',
  180.00
);