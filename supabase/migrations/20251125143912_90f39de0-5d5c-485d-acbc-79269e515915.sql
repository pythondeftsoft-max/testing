-- Delete the auto-generated "Thank you" messages that were created by the now-removed trigger
-- These messages were never actually sent by landlords and cause fake notification badges
DELETE FROM messages 
WHERE message_text = 'Thank you for your application! I''ll review it and get back to you soon.'
  AND created_at >= '2025-11-25';