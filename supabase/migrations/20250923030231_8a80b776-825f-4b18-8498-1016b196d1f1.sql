-- Add missing status values to maintenance_requests
ALTER TABLE maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_status_check;
ALTER TABLE maintenance_requests ADD CONSTRAINT maintenance_requests_status_check 
CHECK (status IN ('pending', 'in_progress', 'completed', 'new', 'deferred', 'closed'));

-- Add missing category values to maintenance_requests
ALTER TABLE maintenance_requests DROP CONSTRAINT IF EXISTS maintenance_requests_category_check;
ALTER TABLE maintenance_requests ADD CONSTRAINT maintenance_requests_category_check 
CHECK (category IN ('plumbing', 'electrical', 'hvac', 'appliance_repair', 'flooring', 'painting', 'roofing', 'landscaping', 'cleaning', 'pest_control', 'security_systems', 'other', 'complaint', 'construction_request', 'feedback_suggestion', 'general_inquiry', 'maintenance'));