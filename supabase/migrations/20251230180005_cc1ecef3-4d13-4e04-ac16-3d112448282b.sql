-- Drop the old function with uuid parameter types to resolve ambiguity
DROP FUNCTION IF EXISTS public.landlord_send_lease(
  uuid,           -- p_application_id
  text,           -- p_lease_method
  uuid,           -- p_lease_document_id (OLD - uuid)
  uuid,           -- p_unit_id
  uuid            -- p_landlord_signature (OLD - uuid)
);