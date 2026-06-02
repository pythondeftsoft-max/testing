
-- Drop the old conflicting INSERT policy
DROP POLICY IF EXISTS "Tenants can create maintenance requests" ON maintenance_requests;

-- The comprehensive policy "Tenants can create requests for assigned properties" should remain
-- It checks both approved applications AND unit assignments
