-- Add bulk messaging support to admin_messages table
ALTER TABLE admin_messages 
ADD COLUMN recipient_group TEXT CHECK (recipient_group IN ('all', 'landlords', 'tenants')),
ADD COLUMN is_bulk_message BOOLEAN DEFAULT FALSE;

-- Make recipient_user_id nullable since bulk messages won't have individual recipient
ALTER TABLE admin_messages 
ALTER COLUMN recipient_user_id DROP NOT NULL;

-- Add constraint: must have either recipient_user_id OR recipient_group
ALTER TABLE admin_messages 
ADD CONSTRAINT check_recipient 
CHECK (
  (recipient_user_id IS NOT NULL AND recipient_group IS NULL) 
  OR 
  (recipient_user_id IS NULL AND recipient_group IS NOT NULL)
);

-- Create view to track bulk message recipients
CREATE OR REPLACE VIEW admin_bulk_message_recipients AS
SELECT 
  am.id as message_id,
  am.subject,
  am.message_text,
  am.message_type,
  am.recipient_group,
  am.created_at,
  p.id as recipient_user_id,
  p.first_name,
  p.last_name,
  p.email,
  p.user_type
FROM admin_messages am
CROSS JOIN profiles p
WHERE 
  am.is_bulk_message = TRUE
  AND (
    (am.recipient_group = 'all') OR
    (am.recipient_group = 'landlords' AND p.user_type IN ('landlord', 'individual_owner')) OR
    (am.recipient_group = 'tenants' AND p.user_type = 'tenant')
  )
  AND p.user_type != 'admin';