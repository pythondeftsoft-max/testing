-- Revert the overly restrictive policy and restore the original owner-based access
DROP POLICY IF EXISTS "Users can view properties they have access to" ON public.properties;

-- Restore the original policy for property owners to see all their properties
CREATE POLICY "Owners can read their properties"
ON public.properties
FOR SELECT
USING (
  (owner_id = auth.uid()) 
  AND deleted_at IS NULL
);

-- Keep the portfolio access function for future use but don't enforce it in RLS yet
-- The application-level filtering in LandlordDashboard should handle portfolio isolation