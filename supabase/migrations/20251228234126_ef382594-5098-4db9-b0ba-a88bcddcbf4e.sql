-- Drop old constraint
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_one_application_id_required;

-- Create new constraint including property_push_id
ALTER TABLE messages 
ADD CONSTRAINT messages_one_application_id_required 
CHECK (
  (marketplace_application_id IS NOT NULL)::int + 
  (unit_application_id IS NOT NULL)::int + 
  (property_application_id IS NOT NULL)::int +
  (property_push_id IS NOT NULL)::int = 1
);