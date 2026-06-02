-- Backfill landlord signature for existing lease
UPDATE marketplace_applications
SET 
  landlord_signature_name = 'Anthony Sanacore',
  landlord_signed_at = lease_sent_at
WHERE id = 'e0dd51f6-ee7b-4fd7-988a-5bd9dbc8ff33'
  AND lease_sent_at IS NOT NULL
  AND landlord_signature_name IS NULL;