
-- Remove the RLS policy that allows property owners to view tenant documents
-- This ensures tenant personal documents remain private (only tenant and admins can see them)
DROP POLICY IF EXISTS "Property owners can view tenant documents" ON tenant_documents;

-- The following policies remain active:
-- 1. "Users can manage their own document records" - tenants can see their own documents
-- 2. "Admins can view all tenant documents" - admins can see all documents
