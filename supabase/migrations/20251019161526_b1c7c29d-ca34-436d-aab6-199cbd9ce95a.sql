-- Drop the existing marketplace policy that wasn't working for authenticated users
DROP POLICY IF EXISTS "Marketplace users can browse properties on market" ON public.properties;

-- Create explicit policy for authenticated users to browse marketplace
CREATE POLICY "Authenticated users can browse marketplace properties"
ON public.properties
FOR SELECT
TO authenticated
USING (
  status = 'available'
  AND on_market = true
  AND deleted_at IS NULL
);

-- Create explicit policy for anonymous users to browse marketplace
CREATE POLICY "Anonymous users can browse marketplace properties"
ON public.properties
FOR SELECT
TO anon
USING (
  status = 'available'
  AND on_market = true
  AND deleted_at IS NULL
);