-- First, remove any duplicate applications if they exist (from previous failed migrations)
DELETE FROM property_applications 
WHERE tenant_id = '971d14a4-65e3-4a50-9187-28f3b1b2325f' 
AND property_id IN ('adfc3472-56bd-4ed3-aee8-4bb7350ee199', '5a65574e-ffda-4034-917f-f402b2bd3430');

-- Create property applications for tenant kohlniks@gmail.com
DO $$
DECLARE
  app1_id uuid;
  app2_id uuid;
BEGIN
  -- Insert Application 1: For 98 Euclid Ave, Brooklyn (approved status)
  INSERT INTO property_applications (property_id, tenant_id, status, created_at) VALUES
  ('adfc3472-56bd-4ed3-aee8-4bb7350ee199', '971d14a4-65e3-4a50-9187-28f3b1b2325f', 'approved', NOW() - INTERVAL '3 days')
  RETURNING id INTO app1_id;

  -- Insert Application 2: For 123 Euclid Avenue, New York (under_review status)
  INSERT INTO property_applications (property_id, tenant_id, status, created_at) VALUES
  ('5a65574e-ffda-4034-917f-f402b2bd3430', '971d14a4-65e3-4a50-9187-28f3b1b2325f', 'under_review', NOW() - INTERVAL '4 hours')
  RETURNING id INTO app2_id;

  -- Messages for Application 1 (98 Euclid Ave) - Multi-day conversation
  INSERT INTO messages (property_application_id, message_text, sender_id, created_by_tenant, read_by_tenant, read_by_landlord, created_at) VALUES
  (app1_id, 'Hi! I''m interested in the property at 98 Euclid Ave. It looks perfect for what I''m looking for. When would be a good time to schedule a viewing?', '971d14a4-65e3-4a50-9187-28f3b1b2325f', true, true, true, NOW() - INTERVAL '3 days'),
  (app1_id, 'Hello! Thank you for your interest. I have availability this Thursday at 3 PM or Friday at 11 AM. Which works better for you?', 'ccb8536c-80d1-4834-9614-169b9a7caede', false, true, true, NOW() - INTERVAL '2 days 22 hours'),
  (app1_id, 'Thursday at 3 PM works perfectly! I''ll see you then. Should I bring any documents?', '971d14a4-65e3-4a50-9187-28f3b1b2325f', true, true, true, NOW() - INTERVAL '2 days 20 hours'),
  (app1_id, 'Great! Just bring a photo ID and proof of income if you have it handy. See you Thursday!', 'ccb8536c-80d1-4834-9614-169b9a7caede', false, true, true, NOW() - INTERVAL '2 days 19 hours'),
  (app1_id, 'Thank you for showing me the property yesterday! I loved it. I have a question about the lease terms - is it a 1-year lease or are shorter terms available?', '971d14a4-65e3-4a50-9187-28f3b1b2325f', true, true, true, NOW() - INTERVAL '1 day 2 hours'),
  (app1_id, 'I''m glad you liked it! We typically do 1-year leases, but can discuss options. The rent is $2,400/month with first and last month required upfront. Security deposit is one month''s rent.', 'ccb8536c-80d1-4834-9614-169b9a7caede', false, true, true, NOW() - INTERVAL '1 day'),
  (app1_id, 'That all sounds good to me! When would be the earliest possible move-in date?', '971d14a4-65e3-4a50-9187-28f3b1b2325f', true, true, false, NOW() - INTERVAL '6 hours'),
  (app1_id, 'The property is available starting next month, on the 1st. I''ll send over the lease agreement for you to review. Let me know if you have any questions!', 'ccb8536c-80d1-4834-9614-169b9a7caede', false, false, true, NOW() - INTERVAL '2 hours');

  -- Messages for Application 2 (123 Euclid Avenue) - Recent short conversation
  INSERT INTO messages (property_application_id, message_text, sender_id, created_by_tenant, read_by_tenant, read_by_landlord, created_at) VALUES
  (app2_id, 'Hello! I just submitted my application for 123 Euclid Avenue. I''m very excited about this property and would love to see it in person soon!', '971d14a4-65e3-4a50-9187-28f3b1b2325f', true, true, true, NOW() - INTERVAL '3 hours'),
  (app2_id, 'Hi! Thanks for applying. I''d be happy to show you the property. Are you available for a tour this week? I have openings Wednesday and Thursday afternoons.', 'ccb8536c-80d1-4834-9614-169b9a7caede', false, true, true, NOW() - INTERVAL '2 hours'),
  (app2_id, 'Wednesday afternoon would be perfect! What time works best for you? I can do anytime after 2 PM.', '971d14a4-65e3-4a50-9187-28f3b1b2325f', true, true, false, NOW() - INTERVAL '1 hour'),
  (app2_id, 'Let''s plan for 3:30 PM on Wednesday then. I''ll meet you at the property. The address is 123 Euclid Avenue. Looking forward to showing you around!', 'ccb8536c-80d1-4834-9614-169b9a7caede', false, false, true, NOW() - INTERVAL '30 minutes');
END $$;