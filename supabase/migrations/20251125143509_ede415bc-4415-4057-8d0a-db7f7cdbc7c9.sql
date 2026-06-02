-- Remove the trigger that creates automatic messages for new applications
-- This prevents fake "New Message from Landlord" notifications when tenants submit applications
DROP TRIGGER IF EXISTS trigger_create_initial_application_message ON property_applications;

-- Also drop the function since it's no longer needed
DROP FUNCTION IF EXISTS create_initial_application_message();