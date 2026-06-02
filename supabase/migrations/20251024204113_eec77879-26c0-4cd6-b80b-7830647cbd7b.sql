
-- Add diverse sample messages across multiple applications for testing
INSERT INTO messages (property_application_id, message_text, sender_id, created_by_tenant, read_by_tenant, read_by_landlord, created_at) VALUES
-- Application 1: Recent conversation with unread landlord message (567 Community Way)
('439ce6d6-5823-4081-924e-4dbc3b1906d3', 'Hi! I''m very interested in this property at 567 Community Way. When would be a good time for a viewing?', 'eb292509-b618-43b3-869c-0abedd81a26b', true, true, false, NOW() - INTERVAL '2 hours'),
('439ce6d6-5823-4081-924e-4dbc3b1906d3', 'Hello! Thank you for your interest. How about tomorrow at 2 PM?', 'ccb8536c-80d1-4834-9614-169b9a7caede', false, false, true, NOW() - INTERVAL '1 hour'),
('439ce6d6-5823-4081-924e-4dbc3b1906d3', 'That works perfectly! See you then.', 'eb292509-b618-43b3-869c-0abedd81a26b', true, true, true, NOW() - INTERVAL '30 minutes'),

-- Application 2: Older conversation about pets (456 Elm Street)
('097e4475-d940-4502-8788-cdcf2bae8fd3', 'Is the property at 456 Elm Street pet-friendly? I have a small dog.', 'd2b76a2b-9804-430d-976f-eb38cdf8e917', true, true, true, NOW() - INTERVAL '3 days'),
('097e4475-d940-4502-8788-cdcf2bae8fd3', 'Yes, we allow pets with a small deposit. The deposit is $300.', 'ccb8536c-80d1-4834-9614-169b9a7caede', false, true, true, NOW() - INTERVAL '2 days 23 hours'),
('097e4475-d940-4502-8788-cdcf2bae8fd3', 'Perfect! That''s reasonable. I''d like to proceed with the application.', 'd2b76a2b-9804-430d-976f-eb38cdf8e917', true, true, true, NOW() - INTERVAL '2 days 22 hours'),
('097e4475-d940-4502-8788-cdcf2bae8fd3', 'Great! I''ll send over the lease agreement soon.', 'ccb8536c-80d1-4834-9614-169b9a7caede', false, true, true, NOW() - INTERVAL '2 days 20 hours'),

-- Application 3: Unread landlord response about utilities (123 Oak Street)
('fd13c9fd-7040-44e7-8797-1481d108baba', 'What utilities are included in the rent at 123 Oak Street?', 'f9700b24-4fc2-4b72-8479-409c5d64b586', true, true, false, NOW() - INTERVAL '1 day'),
('fd13c9fd-7040-44e7-8797-1481d108baba', 'Water and trash are included. Electric and gas are tenant responsibility.', 'b7843bb0-64bd-4ff3-9392-b73c111832ce', false, false, true, NOW() - INTERVAL '12 hours'),
('fd13c9fd-7040-44e7-8797-1481d108baba', 'Also, is internet included or do tenants arrange that separately?', 'f9700b24-4fc2-4b72-8479-409c5d64b586', true, true, false, NOW() - INTERVAL '6 hours'),

-- Application 4: Multiple back and forth with parking question (890 Studio Plaza)
('efd066a6-ce34-47e7-b684-978e760e1135', 'Hello! I saw your listing for 890 Studio Plaza and I''m interested.', '9cf6bcaf-9f49-4bcf-90ad-beee8b631de6', true, true, true, NOW() - INTERVAL '5 days'),
('efd066a6-ce34-47e7-b684-978e760e1135', 'Great! Would you like to schedule a tour of the studio?', 'ccb8536c-80d1-4834-9614-169b9a7caede', false, true, true, NOW() - INTERVAL '4 days 23 hours'),
('efd066a6-ce34-47e7-b684-978e760e1135', 'Yes please! Is this weekend available?', '9cf6bcaf-9f49-4bcf-90ad-beee8b631de6', true, true, true, NOW() - INTERVAL '4 days 22 hours'),
('efd066a6-ce34-47e7-b684-978e760e1135', 'Saturday at 10 AM works for me. Does that work for you?', 'ccb8536c-80d1-4834-9614-169b9a7caede', false, true, true, NOW() - INTERVAL '4 days 20 hours'),
('efd066a6-ce34-47e7-b684-978e760e1135', 'Perfect! I''ll be there. What''s the parking situation?', '9cf6bcaf-9f49-4bcf-90ad-beee8b631de6', true, true, false, NOW() - INTERVAL '4 days 19 hours'),
('efd066a6-ce34-47e7-b684-978e760e1135', 'There''s a dedicated parking spot included. I''ll show you during the tour.', 'ccb8536c-80d1-4834-9614-169b9a7caede', false, false, true, NOW() - INTERVAL '4 days 18 hours');
