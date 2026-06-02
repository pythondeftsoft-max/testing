
-- Update RLS policies to allow test data creation

-- Allow property owners to create profiles for their tenant test data
CREATE POLICY "Property owners can create tenant profiles for test data" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE owner_id = auth.uid()
    )
  );

-- Allow property owners to create tenant profile details for their applicants
CREATE POLICY "Property owners can create tenant profile details for applicants" 
  ON public.tenant_profiles 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE owner_id = auth.uid()
    )
  );

-- Allow property owners to create applications for their properties
CREATE POLICY "Property owners can create applications for their properties" 
  ON public.property_applications 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

-- Update existing policy to be less restrictive for profiles viewing
DROP POLICY IF EXISTS "Property owners can view tenant profiles of applicants" ON public.profiles;
CREATE POLICY "Property owners can view tenant profiles of applicants" 
  ON public.profiles 
  FOR SELECT 
  USING (
    user_type = 'tenant' AND (
      EXISTS (
        SELECT 1 FROM public.property_applications pa
        JOIN public.properties p ON pa.property_id = p.id
        WHERE pa.tenant_id = profiles.id AND p.owner_id = auth.uid()
      )
    )
  );

-- Ensure property owners can view profiles they created
CREATE POLICY "Property owners can view profiles they manage" 
  ON public.profiles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.property_applications pa
      JOIN public.properties p ON pa.property_id = p.id
      WHERE pa.tenant_id = profiles.id AND p.owner_id = auth.uid()
    )
  );
