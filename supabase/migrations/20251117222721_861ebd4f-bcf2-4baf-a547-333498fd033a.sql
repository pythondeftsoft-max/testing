-- Update state for test tenants to use abbreviation 'MO' to match territories.region_code
UPDATE tenant_profiles 
SET state = 'MO'
WHERE user_id IN ('9cf6bcaf-9f49-4bcf-90ad-beee8b631de6', '03e26106-4179-4b55-bd38-66c5414e8ba2');