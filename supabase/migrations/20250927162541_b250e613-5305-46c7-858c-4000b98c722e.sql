-- Fix overly permissive RLS policy that allows users to see all available properties
-- This was causing the rental owner ending balances report to show all properties instead of just user-owned properties

-- First, drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can browse available properties" ON public.properties;

-- Create a new, properly scoped policy for users to browse their own available properties
CREATE POLICY "Users can browse their own available properties" 
ON public.properties 
FOR SELECT 
USING (
  (status = 'available'::text) 
  AND (deleted_at IS NULL) 
  AND (owner_id = auth.uid())
);

-- If marketplace functionality is needed later, create a separate controlled policy
-- This is commented out for now but can be enabled if genuine marketplace browsing is required
/*
CREATE POLICY "Marketplace browsing for specific contexts" 
ON public.properties 
FOR SELECT 
USING (
  (status = 'available'::text) 
  AND (deleted_at IS NULL) 
  AND (on_market = true)
  AND (marketplace_enabled = true) -- hypothetical flag for marketplace properties
);
*/