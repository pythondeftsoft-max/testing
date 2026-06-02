
-- Fix the RLS policies completely to resolve the fetching issues

-- First, disable RLS temporarily to clear any problematic policies
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on properties to start clean
DROP POLICY IF EXISTS "Property owners can manage their own properties" ON public.properties;
DROP POLICY IF EXISTS "Anyone can view available properties" ON public.properties;
DROP POLICY IF EXISTS "Property owners can view their own properties" ON public.properties;
DROP POLICY IF EXISTS "Property owners can insert their own properties" ON public.properties;
DROP POLICY IF EXISTS "Property owners can update their own properties" ON public.properties;
DROP POLICY IF EXISTS "Property owners can delete their own properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can manage their properties" ON public.properties;
DROP POLICY IF EXISTS "Owners can view their properties" ON public.properties;
DROP POLICY IF EXISTS "Property managers can manage portfolio properties" ON public.properties;
DROP POLICY IF EXISTS "Property managers can view portfolio properties" ON public.properties;
DROP POLICY IF EXISTS "Admins can view all properties" ON public.properties;
DROP POLICY IF EXISTS "All authenticated users can view properties for sale" ON public.properties;

-- Re-enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, clean policies for properties
CREATE POLICY "Property owners can view their properties" 
  ON public.properties 
  FOR SELECT 
  USING (owner_id = auth.uid());

CREATE POLICY "Property owners can insert their properties" 
  ON public.properties 
  FOR INSERT 
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Property owners can update their properties" 
  ON public.properties 
  FOR UPDATE 
  USING (owner_id = auth.uid());

CREATE POLICY "Property owners can delete their properties" 
  ON public.properties 
  FOR DELETE 
  USING (owner_id = auth.uid());

-- Allow anyone to view available properties (for tenant browsing)
CREATE POLICY "Anyone can view available properties" 
  ON public.properties 
  FOR SELECT 
  USING (status = 'available');

-- Allow admins to view all properties
CREATE POLICY "Admins can view all properties" 
  ON public.properties 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Clean policies for profiles (no recursion)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.profiles;
DROP POLICY IF EXISTS "Landlords can view tenant profiles of their applicants" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (id = auth.uid());

-- Allow property owners to view tenant profiles of their applicants (simplified)
CREATE POLICY "Property owners can view tenant profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (
    user_type = 'tenant' AND 
    id IN (
      SELECT tenant_id FROM property_applications pa
      WHERE pa.property_id IN (
        SELECT id FROM properties WHERE owner_id = auth.uid()
      )
    )
  );
