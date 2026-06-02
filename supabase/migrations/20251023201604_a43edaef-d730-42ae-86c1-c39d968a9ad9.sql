-- Add 3 maintenance requests for tenant Logan Rodriguez matching existing notifications
INSERT INTO maintenance_requests (
  property_id, unit_id, tenant_id, title, description, 
  category, priority, status, submitted_date, completed_date, created_at, updated_at
) VALUES
  ('d1cf082b-19bd-477a-a84d-4e5f4023aa88', 'd3a6d098-f7f2-4c3c-89eb-ece50ada399c', 
   '03e26106-4179-4b55-bd38-66c5414e8ba2',
   'Low Water Pressure in Bathroom',
   'Tenant reports low water pressure in bathroom sink and shower. Technician will contact within 24 hours.',
   'plumbing', 'high', 'pending', NOW() - INTERVAL '2 hours', NULL, NOW(), NOW()),
   
  ('d1cf082b-19bd-477a-a84d-4e5f4023aa88', 'd3a6d098-f7f2-4c3c-89eb-ece50ada399c',
   '03e26106-4179-4b55-bd38-66c5414e8ba2',
   'Heating System Repair',
   'HVAC system has been repaired and tested. System now fully operational.',
   'hvac', 'medium', 'completed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '4 hours', NOW(), NOW()),
   
  ('d1cf082b-19bd-477a-a84d-4e5f4023aa88', 'd3a6d098-f7f2-4c3c-89eb-ece50ada399c',
   '03e26106-4179-4b55-bd38-66c5414e8ba2',
   'Bedroom Outlet Not Working',
   'Bedroom outlet stopped working. Electrician has been dispatched and is on the way.',
   'electrical', 'high', 'in_progress', NOW() - INTERVAL '30 minutes', NULL, NOW(), NOW());

-- Add 2 more property applications to match notification themes
INSERT INTO property_applications (
  tenant_id, property_id, unit_id, status, priority_payment_made, created_at, updated_at
) VALUES
  ('03e26106-4179-4b55-bd38-66c5414e8ba2',
   '5a65574e-ffda-4034-917f-f402b2bd3430',
   NULL,
   'under_review',
   false,
   NOW() - INTERVAL '3 days',
   NOW()),
   
  ('03e26106-4179-4b55-bd38-66c5414e8ba2',
   '0729102c-387f-4957-863f-75868e2a7573',
   NULL,
   'pending',
   false,
   NOW() - INTERVAL '5 days',
   NOW());

-- Add lease renewal offer matching notifications (using existing table structure)
INSERT INTO lease_renewals (
  tenant_id, property_id,
  current_lease_end, proposed_lease_end,
  new_rent_amount,
  renewal_status, renewal_type,
  custom_template_uploaded,
  notice_sent_date, response_due_date,
  notes
) VALUES
  ('03e26106-4179-4b55-bd38-66c5414e8ba2',
   'd1cf082b-19bd-477a-a84d-4e5f4023aa88',
   '2025-12-31',
   '2026-12-31',
   1920.00,
   'pending',
   'platform_system',
   false,
   NOW() - INTERVAL '7 days',
   NOW() + INTERVAL '14 days',
   'Current rent: $1850. Proposed rent: $1920 (3.78% increase).');

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES profiles(id),
  property_id UUID REFERENCES properties(id),
  unit_id UUID REFERENCES property_units(id),
  appointment_type TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'scheduled',
  title TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for appointments
CREATE POLICY "Users can view their own appointments"
  ON appointments FOR SELECT
  USING (auth.uid() = tenant_id);

CREATE POLICY "Users can update their own appointments"
  ON appointments FOR UPDATE
  USING (auth.uid() = tenant_id);

-- Add annual inspection matching notification
INSERT INTO appointments (
  tenant_id, property_id, unit_id,
  appointment_type, scheduled_date, scheduled_time,
  duration_minutes, status, title, description
) VALUES
  ('03e26106-4179-4b55-bd38-66c5414e8ba2',
   'd1cf082b-19bd-477a-a84d-4e5f4023aa88',
   'd3a6d098-f7f2-4c3c-89eb-ece50ada399c',
   'inspection',
   '2025-10-28',
   '10:00:00',
   60,
   'scheduled',
   'Annual Unit Inspection',
   'Your annual unit inspection is scheduled. Please be available to provide access. This is a routine inspection of unit condition and safety systems.');