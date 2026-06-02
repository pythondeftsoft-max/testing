-- Drop old policies that check status='available'
DROP POLICY IF EXISTS "Authenticated users can browse marketplace properties" ON properties;
DROP POLICY IF EXISTS "Anonymous users can browse marketplace properties" ON properties;

-- Create new policies that only check on_market flag
CREATE POLICY "Authenticated users can browse marketplace properties"
ON properties
FOR SELECT
TO authenticated
USING (on_market = true AND deleted_at IS NULL);

CREATE POLICY "Anonymous users can browse marketplace properties"
ON properties
FOR SELECT
TO anon
USING (on_market = true AND deleted_at IS NULL);