-- Drop policies that cause infinite recursion by querying profiles table
-- The profiles table has policies that query properties, creating circular dependency

-- Drop the admin view policy on properties (queries profiles which queries properties)
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;

-- Drop the admin appointments fallback policy (queries profiles which could cause recursion)
DROP POLICY IF EXISTS "Admin users can create appointments (fallback)" ON public.maintenance_appointments;