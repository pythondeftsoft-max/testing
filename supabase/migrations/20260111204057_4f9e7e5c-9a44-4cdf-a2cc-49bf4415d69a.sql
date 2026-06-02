-- Fix reject_unit_applications_on_delist function - remove invalid 'pending' enum value
-- The application_status enum doesn't include 'pending', only 'draft', 'submitted', 'withdrawn', etc.

CREATE OR REPLACE FUNCTION reject_unit_applications_on_delist(
  p_unit_id UUID,
  p_reason TEXT DEFAULT 'Property taken off market'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Withdraw property_applications (removed 'pending' - not a valid enum value)
  UPDATE property_applications
  SET 
    status = 'withdrawn',
    withdrawn_at = NOW(),
    withdrawn_reason = p_reason
  WHERE unit_id = p_unit_id
    AND status IN ('submitted', 'draft')
    AND withdrawn_at IS NULL;

  -- Withdraw marketplace_applications (removed 'pending' - not a valid enum value)
  UPDATE marketplace_applications
  SET 
    status = 'withdrawn',
    withdrawn_at = NOW(),
    withdrawn_reason = p_reason
  WHERE unit_id = p_unit_id
    AND status IN ('submitted', 'draft')
    AND withdrawn_at IS NULL;

  -- Reset unit applications pipeline data
  UPDATE unit_applications
  SET 
    pipeline_stage = 'unassigned',
    is_primary_applicant = false
  WHERE unit_id = p_unit_id;
END;
$$;