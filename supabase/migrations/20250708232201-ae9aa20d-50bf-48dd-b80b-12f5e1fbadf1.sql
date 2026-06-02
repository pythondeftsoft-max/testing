-- Fix RLS policy for tenants to view available properties
-- The current "Anyone can view available properties" policy should work,
-- but let's make sure it's properly configured

-- First, let's check if the policy exists and recreate it to ensure it's working
DROP POLICY IF EXISTS "Anyone can view available properties" ON public.properties;

-- Create a clear policy for viewing available properties
CREATE POLICY "Public can view available properties" 
ON public.properties 
FOR SELECT 
USING (status = 'available');

-- Also ensure tenants can view properties specifically
CREATE POLICY "Authenticated users can view available properties" 
ON public.properties 
FOR SELECT 
TO authenticated
USING (status = 'available');