
-- Fix infinite recursion in properties RLS policies

-- Drop problematic properties policies that might cause recursion
DROP POLICY IF EXISTS "Property owners can view profiles they manage" ON public.profiles;
DROP POLICY IF EXISTS "Landlords can view applicant profiles" ON public.profiles;

-- Simplify properties policies to avoid recursion
DROP POLICY IF EXISTS "Property owners can manage portfolio properties" ON public.properties;
DROP POLICY IF EXISTS "Property owners can view portfolio properties" ON public.properties;

-- Create simple, non-recursive policies for properties
CREATE POLICY "Property owners can manage their properties" 
  ON public.properties 
  FOR ALL 
  USING (owner_id = auth.uid());

-- Simplify profiles policies - remove complex joins that cause recursion
CREATE POLICY "Landlords can view tenant profiles through applications" 
  ON public.profiles 
  FOR SELECT 
  USING (
    user_type = 'tenant' AND 
    EXISTS (
      SELECT 1 FROM property_applications 
      WHERE tenant_id = profiles.id 
      AND property_id IN (
        SELECT id FROM properties WHERE owner_id = auth.uid()
      )
    )
  );

-- Ensure property applications policies don't cause recursion
DROP POLICY IF EXISTS "Property owners can manage applications for their properties" ON public.property_applications;

CREATE POLICY "Property owners can view applications for their properties" 
  ON public.property_applications 
  FOR SELECT 
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can update applications for their properties" 
  ON public.property_applications 
  FOR UPDATE 
  USING (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Property owners can insert applications for their properties" 
  ON public.property_applications 
  FOR INSERT 
  WITH CHECK (
    property_id IN (
      SELECT id FROM properties WHERE owner_id = auth.uid()
    )
  );
