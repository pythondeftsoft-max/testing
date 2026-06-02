-- Add messages to existing applications for tenant@openkey.com demo account
-- This creates realistic conversation threads for testing the messaging UI

DO $$
DECLARE
  tenant_user_id uuid := '03e26106-4179-4b55-bd38-66c5414e8ba2'; -- tenant@openkey.com
  landlord_user_id uuid := 'ccb8536c-80d1-4834-9614-169b9a7caede'; -- admin landlord
  app2_id uuid := 'f5fbe779-1a43-43f0-a1c2-c9e46efb6f3a'; -- 123 Euclid Avenue, NY
  app3_id uuid := '818a71ff-b88a-48a1-aaa7-9e27589f399e'; -- Property 2 on ABC, NY
BEGIN
  -- Messages for Application 2 (123 Euclid Avenue, NY - under_review)
  -- 6 messages with conversation about viewing and application status
  INSERT INTO messages (property_application_id, message_text, sender_id, created_by_tenant, read_by_tenant, read_by_landlord, created_at) VALUES
  (app2_id, 'Hi! I''m very interested in the property at 123 Euclid Avenue. Could you tell me more about the neighborhood and nearby amenities?', tenant_user_id, true, true, true, NOW() - INTERVAL '5 days'),
  (app2_id, 'Hello! The neighborhood is wonderful - very walkable with great restaurants, parks, and the subway is just 2 blocks away. Would you like to schedule a viewing?', landlord_user_id, false, true, true, NOW() - INTERVAL '4 days 20 hours'),
  (app2_id, 'That sounds perfect! I''d love to schedule a viewing. I''m available this week on Tuesday or Wednesday afternoon.', tenant_user_id, true, true, true, NOW() - INTERVAL '4 days 18 hours'),
  (app2_id, 'Great! Let''s do Wednesday at 4 PM. Also, I wanted to let you know that your application is currently under review. I should have an update for you by end of week.', landlord_user_id, false, true, true, NOW() - INTERVAL '4 days 16 hours'),
  (app2_id, 'Thanks for the viewing! The property exceeded my expectations. Have you had a chance to review my application yet? I''m very interested in moving forward.', tenant_user_id, true, true, false, NOW() - INTERVAL '2 days'),
  (app2_id, 'I''m reviewing all applications this week. Your application looks strong - I just need to verify a few references. I''ll have a final decision for you by Friday. Stay tuned!', landlord_user_id, false, false, true, NOW() - INTERVAL '1 day 8 hours');

  -- Messages for Application 3 (Property 2 on ABC, NY - pending)
  -- 4 messages with initial inquiry and recent follow-up
  INSERT INTO messages (property_application_id, message_text, sender_id, created_by_tenant, read_by_tenant, read_by_landlord, created_at) VALUES
  (app3_id, 'Hello! I just submitted an application for Property 2 on ABC. When would be the earliest move-in date if approved?', tenant_user_id, true, true, true, NOW() - INTERVAL '2 days'),
  (app3_id, 'Hi there! Thanks for your application. The property is available immediately - you could move in as early as next week if everything checks out. I''ll review your application and get back to you soon.', landlord_user_id, false, true, true, NOW() - INTERVAL '1 day 20 hours'),
  (app3_id, 'That''s great news! I''m flexible on the move-in date. Also, are pets allowed? I have a small, well-behaved cat.', tenant_user_id, true, true, false, NOW() - INTERVAL '6 hours'),
  (app3_id, 'Yes, we allow cats! There''s a $200 pet deposit and $25/month pet rent. I''ll include the pet addendum with your lease if approved. Should hear back soon!', landlord_user_id, false, false, true, NOW() - INTERVAL '2 hours');

END $$;