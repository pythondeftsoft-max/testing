
-- First, let's see what properties exist in the database
SELECT id, address, desired_rent, tenant_request_count, status 
FROM properties 
WHERE desired_rent IS NOT NULL OR tenant_request_count > 0
LIMIT 10;

-- Also check all properties to see what we have
SELECT id, address, desired_rent, tenant_request_count, status, monthly_rent
FROM properties 
LIMIT 10;
