-- Allow maintenance requests to be created without a tenant (landlord-initiated)
ALTER TABLE maintenance_requests 
ALTER COLUMN tenant_id DROP NOT NULL;

-- Add a comment explaining why this is nullable
COMMENT ON COLUMN maintenance_requests.tenant_id IS 
'The tenant who submitted the request. NULL for landlord/admin-initiated requests.';