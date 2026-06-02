-- Fix RLS policy to allow property owners to update their properties regardless of portfolio_id
-- This fixes the "Failed to update financial details" error when saving Total Rent as 0

-- Drop the restrictive policy that requires portfolio_id
DROP POLICY IF EXISTS "Owners can update their portfolio properties" ON properties;

-- Create a more permissive update policy based on ownership
CREATE POLICY "Owners can update their own properties"
ON properties FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());