-- One-time fix: Insert missing lease notification message for 115 Monteith Cir tenant
-- Application ID: e0dd51f6-ee7b-4fd7-988a-5bd9dbc8ff33
-- This message was not created when the lease was originally sent due to a database function bug

INSERT INTO messages (
  sender_id,
  marketplace_application_id,
  message_text,
  extension,
  created_by_tenant,
  read_by_tenant,
  read_by_landlord,
  created_at
) VALUES (
  'ccb8536c-80d1-4834-9614-169b9a7caede'::UUID, -- Landlord ID
  'e0dd51f6-ee7b-4fd7-988a-5bd9dbc8ff33'::UUID, -- Application ID
  '📝 Your lease agreement for 115 monteith cir, Saint Louis, mo has been sent. Please review and sign the lease to complete your application.',
  'lease_notification',
  false,
  false,
  true,
  '2025-11-25 23:23:43'::TIMESTAMPTZ -- Match the original lease_sent_at timestamp
)
ON CONFLICT DO NOTHING; -- Safety: Don't insert if somehow already exists