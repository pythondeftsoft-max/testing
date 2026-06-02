-- Drop duplicate landlord_send_lease functions to resolve ambiguity

-- Drop the incomplete 4-parameter version
DROP FUNCTION IF EXISTS landlord_send_lease(uuid, text, uuid, uuid);

-- Drop the old 5-parameter version with TEXT type for lease_document_id
DROP FUNCTION IF EXISTS landlord_send_lease(uuid, text, text, uuid, text);