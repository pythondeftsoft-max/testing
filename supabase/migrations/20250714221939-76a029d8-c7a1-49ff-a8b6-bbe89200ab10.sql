-- Fix portfolio property isolation by removing overly permissive RLS policies
-- that allow any authenticated user to see all available properties

-- Drop the problematic policies that bypass portfolio filtering
DROP POLICY IF EXISTS "Authenticated users can view available properties" ON public.properties;
DROP POLICY IF EXISTS "Public can view available properties" ON public.properties;

-- The remaining policies will provide proper access control:
-- 1. "Owners can read their properties" - landlords see only their properties
-- 2. "Tenants can view properties they have applications for" - tenants see only relevant properties  
-- 3. "Admins can view all properties" - admin access
-- 4. Standard CRUD policies for owners

-- This ensures portfolio isolation works correctly and properties are only visible
-- within their intended scope