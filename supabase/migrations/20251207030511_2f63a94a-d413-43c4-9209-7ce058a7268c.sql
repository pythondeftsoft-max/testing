-- Fix RLS policy that's blocking property owners from seeing their occupied units
-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Authenticated users can view available units" ON property_units;

-- Create a better policy that allows marketplace viewing AND owner access
CREATE POLICY "Authenticated users can view available units for marketplace" 
ON property_units FOR SELECT
USING (
  -- Available units on market viewable by any authenticated user (for marketplace)
  (status = 'available' AND on_market = TRUE)
  OR
  -- Property owners can see all their own units
  EXISTS (
    SELECT 1 FROM properties 
    WHERE properties.id = property_units.property_id 
    AND properties.owner_id = auth.uid()
  )
);

-- Backfill: Fix units that are off-market but incorrectly showing 'available' - should be 'vacant'
UPDATE property_units
SET status = 'vacant', updated_at = NOW()
WHERE on_market = FALSE 
AND status = 'available';