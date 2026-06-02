-- Insert test notifications for tenant dashboard to demonstrate enhanced routing logic
INSERT INTO public.notifications (user_id, title, description, type, link, read, created_at) VALUES 
-- Maintenance notifications
((SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'), 
 'Maintenance Request Approved', 
 'Your kitchen faucet repair request has been approved and scheduled for tomorrow.', 
 'maintenance_request', 
 '/tenant-maintenance-requests', 
 false, 
 NOW() - INTERVAL '2 hours'),

((SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'), 
 'Urgent Plumbing Issue', 
 'Emergency plumbing repair needed in your unit. Maintenance team has been dispatched.', 
 'maintenance_urgent', 
 NULL, 
 false, 
 NOW() - INTERVAL '30 minutes'),

-- Lease notifications  
((SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'), 
 'Lease Renewal Reminder', 
 'Your lease expires in 60 days. Please review the renewal terms in your tenant profile.', 
 'lease_renewal', 
 '/tenant-profile', 
 true, 
 NOW() - INTERVAL '1 day'),

((SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'), 
 'Lease Expiring Soon', 
 'Your lease will expire in 30 days. Please contact your landlord to discuss renewal options.', 
 'lease_expiring_soon', 
 NULL, 
 false, 
 NOW() - INTERVAL '6 hours'),

-- Payment notifications
((SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'), 
 'Rent Payment Reminder', 
 'Your rent payment of $1,200 is due in 3 days. You can pay online through your tenant portal.', 
 'payment_reminder', 
 '/tenant-rent-payments', 
 false, 
 NOW() - INTERVAL '4 hours'),

((SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'), 
 'Payment Received', 
 'Thank you! Your rent payment of $1,200 has been received and processed successfully.', 
 'payment_received', 
 NULL, 
 true, 
 NOW() - INTERVAL '3 days'),

-- Application notifications
((SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'), 
 'Application Approved', 
 'Congratulations! Your rental application for 456 Oak Avenue has been approved.', 
 'application_approved', 
 '/tenant-applications', 
 false, 
 NOW() - INTERVAL '5 hours'),

((SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'), 
 'Application Update Required', 
 'Please update your income verification documents to complete your application.', 
 'application_update', 
 NULL, 
 true, 
 NOW() - INTERVAL '2 days'),

-- Property notifications
((SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'), 
 'Property Inspection Notice', 
 'Annual property inspection scheduled for next Tuesday at 2 PM. Please ensure access to all areas.', 
 'property_update', 
 '/tenant-dashboard', 
 false, 
 NOW() - INTERVAL '8 hours'),

-- General notification
((SELECT id FROM auth.users WHERE email = 'tenant@openkey.com'), 
 'Welcome to OpenKey', 
 'Welcome to your new tenant portal! Here you can manage payments, maintenance requests, and more.', 
 'general', 
 NULL, 
 true, 
 NOW() - INTERVAL '7 days');