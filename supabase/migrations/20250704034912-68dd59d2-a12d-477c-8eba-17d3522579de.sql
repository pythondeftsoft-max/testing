
-- Fix infinite recursion in RLS policies

-- First, drop all the problematic policies that are causing circular references
DROP POLICY IF EXISTS "Property owners can view tenant profiles of applicants" ON public.profiles;
DROP POLICY IF EXISTS "Property owners can view profiles they manage" ON public.profiles;
DROP POLICY IF EXISTS "Property owners can create tenant profiles for test data" ON public.profiles;

-- Create simplified, non-recursive policies for profiles
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

-- Allow landlords to view tenant profiles only through direct application relationships
CREATE POLICY "Landlords can view applicant profiles" 
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

-- Ensure property applications policies are simple
DROP POLICY IF EXISTS "Property owners can create applications for their properties" ON public.property_applications;
CREATE POLICY "Property owners can manage applications for their properties" 
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
