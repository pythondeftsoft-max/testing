-- Step 2B: Backfill messages for existing maintenance requests

DO $$
DECLARE
  mr RECORD;
  property_app_id UUID := '375ef966-caac-4281-8015-020c731f1f83';
  tenant_id_var UUID := '03e26106-4179-4b55-bd38-66c5414e8ba2';
  message_payload JSONB;
  message_text TEXT;
  inserted_count INTEGER := 0;
BEGIN
  FOR mr IN 
    SELECT * FROM maintenance_requests 
    WHERE id IN (
      '09a70d76-7196-4369-873c-6683a9b87037',
      '70c4b95a-ae6b-4b98-9956-dc2a2f6ac359',
      '9b598401-b3e3-4a4a-ac80-bbc219f744cc',
      'cabe2d23-e275-42ad-a46f-4f1953fa373f',
      '5531e70d-d60b-4590-a99e-4e5ac160649b',
      '88592c70-746b-4854-baec-26cf8c96d29e',
      '9580dfcd-41d0-4a73-8707-e87a7ae72b59'
    )
    ORDER BY created_at
  LOOP
    -- Check if message already exists
    IF EXISTS (
      SELECT 1 FROM messages m
      WHERE m.property_application_id = property_app_id
        AND m.extension = 'maintenance'
        AND m.payload->>'maintenance_request_id' = mr.id::text
    ) THEN
      CONTINUE;
    END IF;
    
    -- Build message payload and text
    message_payload := jsonb_build_object(
      'maintenance_request_id', mr.id,
      'title', mr.title,
      'description', mr.description,
      'priority', mr.priority,
      'status', mr.status
    );
    
    message_text := 'New maintenance request: ' || mr.title;
    
    -- Insert message
    INSERT INTO messages (
      sender_id,
      property_application_id,
      event,
      message_text,
      payload,
      extension,
      created_at,
      created_by_tenant
    ) VALUES (
      tenant_id_var,
      property_app_id,
      'maintenance_request',
      message_text,
      message_payload,
      'maintenance',
      mr.created_at,
      true
    );
    
    inserted_count := inserted_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Backfilled % maintenance request messages', inserted_count;
END $$;

-- Verify the backfill results
SELECT 
  COUNT(*) as total_messages,
  MIN(created_at) as earliest_message,
  MAX(created_at) as latest_message
FROM messages
WHERE property_application_id = '375ef966-caac-4281-8015-020c731f1f83'
  AND extension = 'maintenance';