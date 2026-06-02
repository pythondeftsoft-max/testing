-- Update the tenant_id in rent_splits to match the current authenticated user
-- This will fix the Monthly Rent breakdown display issue
UPDATE rent_splits 
SET tenant_id = '03e26106-4179-4b55-bd38-66c5414e8ba2', 
    updated_at = NOW()
WHERE property_id = '42e5d1ed-d300-4f3b-b604-11137fd2ea25';