-- Make property_id nullable to allow unit-only requests
ALTER TABLE public.property_tenant_requests 
ALTER COLUMN property_id DROP NOT NULL;