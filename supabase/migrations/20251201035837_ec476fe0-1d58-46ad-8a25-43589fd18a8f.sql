-- Clean up is_primary_applicant flag on housed applications
-- These applications are already housed so they shouldn't have the primary applicant flag set
UPDATE marketplace_applications 
SET is_primary_applicant = false 
WHERE status = 'housed' 
AND is_primary_applicant = true;