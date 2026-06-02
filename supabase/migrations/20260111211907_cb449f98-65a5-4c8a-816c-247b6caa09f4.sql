-- Fix reject_unit_applications_on_delist function
-- Remove reference to non-existent pipeline_stage column in unit_applications

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
  -- Withdraw property_applications
  UPDATE property_applications
  SET 
    status = 'withdrawn',
    withdrawn_at = NOW(),
    withdrawn_reason = p_reason
  WHERE unit_id = p_unit_id
    AND status IN ('submitted', 'draft')
    AND withdrawn_at IS NULL;

  -- Withdraw marketplace_applications
  UPDATE marketplace_applications
  SET 
    status = 'withdrawn',
    withdrawn_at = NOW(),
    withdrawn_reason = p_reason
  WHERE unit_id = p_unit_id
    AND status IN ('submitted', 'draft')
    AND withdrawn_at IS NULL;

  -- Reset unit applications - only update is_primary_applicant
  -- (pipeline_stage column doesn't exist in unit_applications table)
  UPDATE unit_applications
  SET 
    is_primary_applicant = false
  WHERE unit_id = p_unit_id;
END;
$$;