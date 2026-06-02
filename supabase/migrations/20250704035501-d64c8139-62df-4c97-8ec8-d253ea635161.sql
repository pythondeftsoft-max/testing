
-- Comprehensive fix for infinite recursion in RLS policies

-- First, drop all problematic policies that might cause recursion
DROP POLICY IF EXISTS "Property owners can view tenant profiles of applicants" ON public.profiles;
DROP POLICY IF EXISTS "Property owners can view profiles they manage" ON public.profiles;
DROP POLICY IF EXISTS "Property owners can create tenant profiles for test data" ON public.profiles;
DROP POLICY IF EXISTS "Landlords can view tenant profiles through applications" ON public.profiles;
DROP POLICY IF EXISTS "Landlords can view applicant profiles" ON public.profiles;

-- Drop existing properties policies
DROP POLICY IF EXISTS "Property owners can manage portfolio properties" ON public.properties;
DROP POLICY IF EXISTS "Property owners can view portfolio properties" ON public.properties;
DROP POLICY IF EXISTS "Property owners can manage their properties" ON public.properties;

-- Drop existing property applications policies
DROP POLICY IF EXISTS "Property owners can manage applications for their properties" ON public.property_applications;
DROP POLICY IF EXISTS "Property owners can view applications for their properties" ON public.property_applications;
DROP POLICY IF EXISTS "Property owners can update applications for their properties" ON public.property_applications;
DROP POLICY IF EXISTS "Property owners can insert applications for their properties" ON public.property_applications;

-- Create simple, non-recursive policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Allow profile creation during signup" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Simple policy for landlords to view tenant profiles (no recursion)
CREATE POLICY "Landlords can view tenant profiles of their applicants" 
  ON public.profiles 
  FOR SELECT 
  USING (
    user_type = 'tenant' AND 
    id IN (
      SELECT pa.tenant_id 
      FROM property_applications pa 
      JOIN properties p ON pa.property_id = p.id 
      WHERE p.owner_id = auth.uid()
    )
  );

-- Create simple properties policies
CREATE POLICY "Property owners can manage their own properties" 
  ON public.properties 
  FOR ALL 
  USING (owner_id = auth.uid());

-- Create simple property applications policies
CREATE POLICY "Property owners can manage applications" 
  ON public.property_applications 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM properties 
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

-- Allow tenants to create applications
CREATE POLICY "Tenants can create applications" 
  ON public.property_applications 
  FOR INSERT 
  WITH CHECK (auth.uid() = tenant_id);

-- Allow tenants to view their own applications
CREATE POLICY "Tenants can view their own applications" 
  ON public.property_applications 
  FOR SELECT 
  USING (auth.uid() = tenant_id);

-- Ensure tenant profiles policies are simple
DROP POLICY IF EXISTS "Property owners can view tenant profiles of applicants" ON public.tenant_profiles;
CREATE POLICY "Property owners can view tenant profiles of applicants" 
  ON public.tenant_profiles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 
      FROM property_applications pa 
      JOIN properties p ON pa.property_id = p.id 
      WHERE pa.tenant_id = tenant_profiles.user_id 
      AND p.owner_id = auth.uid()
    )
  );
