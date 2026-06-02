-- Restore portfolio-aware RLS policy for properties
DROP POLICY IF EXISTS "Owners can read their properties" ON public.properties;

-- Create a more restrictive policy that respects portfolio boundaries
-- This policy will be used in conjunction with application-level portfolio filtering
CREATE POLICY "Portfolio-aware property access"
ON public.properties
FOR SELECT
USING (
  (owner_id = auth.uid()) 
  AND deleted_at IS NULL
  -- The application will handle portfolio filtering via query parameters
  -- This policy ensures only the owner can see their properties
);

-- Note: We're keeping the policy simple and letting the application handle
-- the portfolio-specific filtering through the WHERE clause in queries