
-- Drop the old category check constraint
ALTER TABLE maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_category_check;

-- Create new constraint that includes both legacy and new simplified categories
ALTER TABLE maintenance_requests ADD CONSTRAINT maintenance_requests_category_check 
CHECK (category IN (
  -- New simplified categories (used in UI)
  'heat',
  'electrical', 
  'appliances',
  'water',
  'other',
  -- Legacy categories (for backward compatibility)
  'plumbing',
  'hvac',
  'appliance_repair',
  'carpentry',
  'painting',
  'landscaping',
  'general_handyman',
  'flooring',
  'roofing',
  'cleaning',
  'pest_control',
  'security_systems',
  'complaint',
  'construction_request',
  'feedback_suggestion',
  'general_inquiry',
  'maintenance'
))
