-- Delete duplicate maintenance messages created by frontend code
-- Keep only the database trigger messages (event = 'maintenance_request')
DELETE FROM messages 
WHERE event = 'maintenance_request_created'
  AND payload->>'maintenance_request_id' IS NOT NULL;