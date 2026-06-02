
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

-- Drop ALL existing policies on profiles to start clean
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.profiles;
DROP POLICY IF EXISTS "Property owners can view tenant profiles of applicants" ON public.profiles;
DROP POLICY IF EXISTS "Property owners can view profiles they manage" ON public.profiles;
DROP POLICY IF EXISTS "Property owners can create tenant profiles for test data" ON public.profiles;
DROP POLICY IF EXISTS "Landlords can view tenant profiles through applications" ON public.profiles;
DROP POLICY IF EXISTS "Landlords can view applicant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Re-enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for properties
CREATE POLICY "Owners can read their properties" 
  ON public.properties 
  FOR SELECT 
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert their properties" 
  ON public.properties 
  FOR INSERT 
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their properties" 
  ON public.properties 
  FOR UPDATE 
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their properties" 
  ON public.properties 
  FOR DELETE 
  USING (owner_id = auth.uid());

-- Allow anyone to view available properties (for tenant browsing)
CREATE POLICY "Anyone can view available properties" 
  ON public.properties 
  FOR SELECT 
  USING (status = 'available');

-- Create simple, non-recursive policies for profiles
CREATE POLICY "Users can read their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (id = auth.uid()) 
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (id = auth.uid());
