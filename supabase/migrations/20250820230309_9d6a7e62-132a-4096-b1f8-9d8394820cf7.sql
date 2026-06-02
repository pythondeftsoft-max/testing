
-- Create test tenant communications data
INSERT INTO public.tenant_communications (
  id, property_id, tenant_id, landlord_id, sender_id, recipient_id,
  subject, message_content, sender_type, message_type, priority, status,
  sent_at, read_at
) VALUES
-- Communications for existing tenants
(gen_random_uuid(), 
 (SELECT id FROM properties WHERE address LIKE '%Main St%' LIMIT 1),
 (SELECT tenant_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 (SELECT owner_id FROM properties WHERE address LIKE '%Main St%' LIMIT 1),
 (SELECT tenant_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 (SELECT owner_id FROM properties WHERE address LIKE '%Main St%' LIMIT 1),
 'Maintenance Request Follow-up',
 'Hi, I wanted to follow up on the maintenance request I submitted last week regarding the kitchen faucet leak. When can we expect someone to come take a look?',
 'tenant', 'maintenance', 'high', 'sent',
 NOW() - INTERVAL '2 days',
 NULL),

(gen_random_uuid(),
 (SELECT id FROM properties WHERE address LIKE '%Main St%' LIMIT 1),
 (SELECT tenant_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 (SELECT owner_id FROM properties WHERE address LIKE '%Main St%' LIMIT 1),
 (SELECT owner_id FROM properties WHERE address LIKE '%Main St%' LIMIT 1),
 (SELECT tenant_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 'Re: Maintenance Request Follow-up',
 'Thanks for reaching out. I have scheduled a plumber to come by tomorrow between 10 AM and 2 PM. Please make sure someone is available to let them in.',
 'landlord', 'maintenance', 'normal', 'sent',
 NOW() - INTERVAL '1 day',
 NOW() - INTERVAL '6 hours'),

(gen_random_uuid(),
 (SELECT id FROM properties WHERE address LIKE '%Main St%' LIMIT 1),
 (SELECT tenant_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 (SELECT owner_id FROM properties WHERE address LIKE '%Main St%' LIMIT 1),
 (SELECT tenant_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 (SELECT owner_id FROM properties WHERE address LIKE '%Main St%' LIMIT 1),
 'Monthly Rent Payment Confirmation',
 'Hi, I just wanted to confirm that my rent payment for this month was processed successfully. I made the payment on the 1st via the online portal.',
 'tenant', 'payment', 'normal', 'sent',
 NOW() - INTERVAL '5 days',
 NOW() - INTERVAL '4 days'),

(gen_random_uuid(),
 (SELECT id FROM properties WHERE address LIKE '%Main St%' LIMIT 1),
 (SELECT tenant_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 (SELECT owner_id FROM properties WHERE address LIKE '%Main St%' LIMIT 1),
 (SELECT owner_id FROM properties WHERE address LIKE '%Main St%' LIMIT 1),
 (SELECT tenant_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 'Lease Renewal Discussion',
 'Hello! I hope you are doing well. I wanted to reach out to discuss the upcoming lease renewal. My current lease expires in 3 months, and I would love to continue living here. Could we schedule a time to discuss terms?',
 'landlord', 'lease', 'normal', 'sent',
 NOW() - INTERVAL '10 days',
 NOW() - INTERVAL '8 days');

-- Create tenant housing history records
INSERT INTO public.tenant_housing_history (
  id, tenant_id, property_id, move_in_date, move_out_date, rent_amount,
  performance_score, lease_renewed, move_out_reason
) VALUES
-- Previous housing for current tenants
(gen_random_uuid(),
 (SELECT tenant_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 gen_random_uuid(), -- Previous property (fictional)
 '2020-06-01'::date,
 '2022-05-31'::date,
 1200.00,
 4.2,
 true,
 'Moved to larger apartment'),

(gen_random_uuid(),
 (SELECT tenant_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 gen_random_uuid(), -- Another previous property
 '2018-08-15'::date,
 '2020-05-31'::date,
 950.00,
 4.8,
 false,
 'Job relocation'),

-- Current housing record
(gen_random_uuid(),
 (SELECT tenant_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 (SELECT property_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 '2022-06-01'::date,
 NULL, -- Current residence
 (SELECT monthly_rent FROM properties WHERE id = (SELECT property_id FROM property_applications WHERE status = 'approved' LIMIT 1)),
 4.5,
 NULL,
 NULL);

-- Create additional maintenance requests with various statuses
INSERT INTO public.maintenance_requests (
  id, property_id, title, description, priority, status, category,
  estimated_cost, actual_cost, created_at, completed_date
) VALUES
(gen_random_uuid(),
 (SELECT property_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 'Kitchen Faucet Leak',
 'The kitchen faucet is dripping constantly and needs repair or replacement.',
 'high',
 'in_progress',
 'plumbing',
 150.00,
 NULL,
 NOW() - INTERVAL '7 days',
 NULL),

(gen_random_uuid(),
 (SELECT property_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 'HVAC Filter Replacement',
 'Scheduled maintenance - replace HVAC air filters throughout the property.',
 'low',
 'completed',
 'hvac',
 25.00,
 30.00,
 NOW() - INTERVAL '14 days',
 NOW() - INTERVAL '10 days'),

(gen_random_uuid(),
 (SELECT property_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 'Bathroom Tile Repair',
 'Several tiles in the master bathroom are loose and need to be re-secured.',
 'medium',
 'pending',
 'flooring',
 200.00,
 NULL,
 NOW() - INTERVAL '3 days',
 NULL),

(gen_random_uuid(),
 (SELECT property_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 'Garage Door Opener Issue',
 'The garage door opener is making unusual noises and sometimes fails to open.',
 'medium',
 'completed',
 'mechanical',
 120.00,
 95.00,
 NOW() - INTERVAL '21 days',
 NOW() - INTERVAL '18 days');

-- Create rent payment records
INSERT INTO public.rent_payments (
  id, property_id, amount, due_date, payment_date, status, days_late, late_fee_amount
) VALUES
-- Recent payments for current tenant
(gen_random_uuid(),
 (SELECT property_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 (SELECT monthly_rent FROM properties WHERE id = (SELECT property_id FROM property_applications WHERE status = 'approved' LIMIT 1)),
 DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day', -- 1st of current month
 DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 day', -- Paid on time
 'completed',
 0,
 0),

(gen_random_uuid(),
 (SELECT property_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 (SELECT monthly_rent FROM properties WHERE id = (SELECT property_id FROM property_applications WHERE status = 'approved' LIMIT 1)),
 DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') + INTERVAL '1 day', -- 1st of last month
 DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') + INTERVAL '3 days', -- Paid 2 days late
 'completed',
 2,
 25.00),

(gen_random_uuid(),
 (SELECT property_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 (SELECT monthly_rent FROM properties WHERE id = (SELECT property_id FROM property_applications WHERE status = 'approved' LIMIT 1)),
 DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months') + INTERVAL '1 day', -- 1st of 2 months ago
 DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months') + INTERVAL '1 day', -- Paid on time
 'completed',
 0,
 0),

(gen_random_uuid(),
 (SELECT property_id FROM property_applications WHERE status = 'approved' LIMIT 1),
 (SELECT monthly_rent FROM properties WHERE id = (SELECT property_id FROM property_applications WHERE status = 'approved' LIMIT 1)),
 DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months') + INTERVAL '1 day', -- 1st of 3 months ago
 DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months') + INTERVAL '1 day', -- Paid on time
 'completed',
 0,
 0);
