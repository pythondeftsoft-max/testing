-- Insert sample messages between logan Rodriguez (Tenant) and Demo Landlord
-- Property: 567 Community Way, Cicero, IL 60804
-- Application ID: 30a8f3fd-1527-48c4-bacc-410de3a3f3b5

INSERT INTO messages (property_application_id, sender_id, message_text, created_by_tenant, created_at) VALUES
-- Message 1: Tenant greeting (2 days ago)
('30a8f3fd-1527-48c4-bacc-410de3a3f3b5', '03e26106-4179-4b55-bd38-66c5414e8ba2', 'Hi Demo, I just moved in yesterday. The place looks great, thank you!', true, NOW() - INTERVAL '2 days'),

-- Message 2: Landlord response (2 days ago, 1 hour later)
('30a8f3fd-1527-48c4-bacc-410de3a3f3b5', 'ccb8536c-80d1-4834-9614-169b9a7caede', 'Welcome logan! So glad to hear you''re settling in. Please let me know if you need anything.', false, NOW() - INTERVAL '2 days' + INTERVAL '1 hour'),

-- Message 3: Tenant maintenance request (1 day ago)
('30a8f3fd-1527-48c4-bacc-410de3a3f3b5', '03e26106-4179-4b55-bd38-66c5414e8ba2', '🔧 **New Maintenance Request**: Kitchen Sink Leaking

**Priority**: high
**Category**: Plumbing

The kitchen sink has been dripping constantly for the past two days. It''s getting worse and water is pooling underneath.', true, NOW() - INTERVAL '1 day'),

-- Message 4: Landlord response to maintenance (1 day ago, 30 min later)
('30a8f3fd-1527-48c4-bacc-410de3a3f3b5', 'ccb8536c-80d1-4834-9614-169b9a7caede', 'Thanks for letting me know! I''ll have my plumber come by tomorrow morning around 10am. Will you be available?', false, NOW() - INTERVAL '1 day' + INTERVAL '30 minutes'),

-- Message 5: Tenant confirmation (1 day ago, 45 min later)
('30a8f3fd-1527-48c4-bacc-410de3a3f3b5', '03e26106-4179-4b55-bd38-66c5414e8ba2', 'Yes, I''ll be here. Thank you for the quick response!', true, NOW() - INTERVAL '1 day' + INTERVAL '45 minutes'),

-- Message 6: System status update (6 hours ago)
('30a8f3fd-1527-48c4-bacc-410de3a3f3b5', '03e26106-4179-4b55-bd38-66c5414e8ba2', '📋 Maintenance request status updated to: **in progress**', false, NOW() - INTERVAL '6 hours'),

-- Message 7: Landlord follow-up (4 hours ago)
('30a8f3fd-1527-48c4-bacc-410de3a3f3b5', 'ccb8536c-80d1-4834-9614-169b9a7caede', 'The plumber just finished. The main valve needed replacing. Everything should be working properly now. Please let me know if you notice any other issues.', false, NOW() - INTERVAL '4 hours'),

-- Message 8: Tenant final confirmation (3 hours ago)
('30a8f3fd-1527-48c4-bacc-410de3a3f3b5', '03e26106-4179-4b55-bd38-66c5414e8ba2', 'Just checked it - working perfectly! Thanks so much for handling it so quickly 👍', true, NOW() - INTERVAL '3 hours');