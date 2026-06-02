-- Fix application withdrawal for filled units
-- 1. Clear is_primary_applicant for all housed tenants (they're current tenants now)
UPDATE marketplace_applications
SET 
  is_primary_applicant = false,
  updated_at = NOW()
WHERE status = 'housed';

-- 2. Withdraw remaining applications for 5194 Coney Island Avenue (Unit 2)
-- Property ID: 8c3bedb5-8058-42b2-b0b6-4e08579f0391
UPDATE marketplace_applications
SET 
  status = 'withdrawn',
  lifecycle_stage = 'withdrawn',
  withdrawn_at = NOW(),
  withdrawn_reason = 'Unit filled - tenant housed',
  updated_at = NOW()
WHERE property_id = '8c3bedb5-8058-42b2-b0b6-4e08579f0391'
  AND status = 'submitted'
  AND user_id != (
    SELECT user_id 
    FROM marketplace_applications 
    WHERE property_id = '8c3bedb5-8058-42b2-b0b6-4e08579f0391' 
      AND status = 'housed' 
    LIMIT 1
  );