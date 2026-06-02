-- Add test viewing appointments to showcase the calendar functionality
INSERT INTO viewing_appointments (
  landlord_id, tenant_id, property_id, appointment_date, viewing_type, status, notes, desired_rent
)
SELECT 
  'ccb8536c-80d1-4834-9614-169b9a7caede', -- landlord ID
  pa.tenant_id,
  pa.property_id,
  -- Schedule appointments at various times this week
  CASE 
    WHEN random() < 0.3 THEN date_trunc('day', now()) + interval '2 days' + interval '10 hours'  -- Tuesday 10 AM
    WHEN random() < 0.6 THEN date_trunc('day', now()) + interval '3 days' + interval '14 hours'  -- Wednesday 2 PM
    ELSE date_trunc('day', now()) + interval '5 days' + interval '16 hours'  -- Friday 4 PM
  END,
  CASE 
    WHEN random() < 0.33 THEN 'video'
    WHEN random() < 0.66 THEN 'phone'
    ELSE 'in_person'
  END,
  CASE 
    WHEN random() < 0.8 THEN 'scheduled'
    WHEN random() < 0.9 THEN 'completed'
    ELSE 'cancelled'
  END,
  CASE 
    WHEN pa.tenant_id = 'eb292509-b618-43b3-869c-0abedd81a26b' THEN 'Nick seems very interested and has good references. Scheduled video call to discuss property details and answer questions.'
    WHEN pa.tenant_id = '9cf6bcaf-9f49-4bcf-90ad-beee8b631de6' THEN 'Logan has excellent credit score. Phone interview to discuss lease terms and move-in timeline.'
    ELSE 'Initial screening interview. Will discuss rental history, income verification, and property requirements.'
  END,
  p.monthly_rent
FROM property_applications pa
JOIN properties p ON p.id = pa.property_id
WHERE p.owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede'
  AND pa.status IN ('pending', 'approved')
  AND random() > 0.3 -- Only create appointments for 70% of applications
ON CONFLICT DO NOTHING;

-- Add a few more appointments for variety in the calendar view
INSERT INTO viewing_appointments (
  landlord_id, tenant_id, property_id, appointment_date, viewing_type, status, notes, desired_rent
) VALUES 
(
  'ccb8536c-80d1-4834-9614-169b9a7caede',
  'eb292509-b618-43b3-869c-0abedd81a26b',
  (SELECT id FROM properties WHERE owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede' AND address LIKE '%Urban Loft%' LIMIT 1),
  date_trunc('day', now()) + interval '1 day' + interval '11 hours', -- Tomorrow 11 AM
  'video',
  'scheduled',
  'Zoom Link: https://zoom.us/j/1234567890
  Meeting ID: 123 456 7890
  Passcode: rent2025',
  2200.00
),
(
  'ccb8536c-80d1-4834-9614-169b9a7caede',
  '9cf6bcaf-9f49-4bcf-90ad-beee8b631de6',
  (SELECT id FROM properties WHERE owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede' AND address LIKE '%Maple Grove%' LIMIT 1),
  date_trunc('day', now()) + interval '4 days' + interval '13 hours', -- Thursday 1 PM
  'in_person',
  'scheduled',
  'Location: 456 Maple Grove Ave, Evanston, IL 60201
  Meet at the front entrance. Bring valid ID and proof of income.',
  3200.00
),
(
  'ccb8536c-80d1-4834-9614-169b9a7caede',
  'd2b76a2b-9804-430d-976f-eb38cdf8e917',
  (SELECT id FROM properties WHERE owner_id = 'ccb8536c-80d1-4834-9614-169b9a7caede' AND address LIKE '%Victorian%' LIMIT 1),
  date_trunc('day', now()) + interval '6 days' + interval '15 hours', -- Saturday 3 PM
  'phone',
  'scheduled',
  'Phone: (555) 123-4567
  Will discuss lease terms and move-in process. Have questions ready about the historic features.',
  1650.00
)
ON CONFLICT DO NOTHING;