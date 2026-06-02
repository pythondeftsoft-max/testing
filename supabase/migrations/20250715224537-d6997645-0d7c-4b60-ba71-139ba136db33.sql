-- Fix RLS policy to allow authenticated tenants to browse available properties
-- Drop any overly restrictive policies that might be blocking tenant access
DROP POLICY IF EXISTS "Strict portfolio isolation for properties" ON public.properties;

-- Ensure authenticated users can browse available properties
CREATE POLICY "Authenticated users can browse available properties" 
ON public.properties 
FOR SELECT 
TO authenticated
USING (status = 'available' AND deleted_at IS NULL);

-- Also ensure property owners can still manage their properties
CREATE POLICY "Property owners can manage their properties" 
ON public.properties 
FOR ALL 
TO authenticated
USING (owner_id = auth.uid());