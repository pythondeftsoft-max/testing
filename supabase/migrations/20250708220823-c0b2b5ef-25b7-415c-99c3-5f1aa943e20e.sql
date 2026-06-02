-- Add RLS policy to allow landlords to view tenant profiles for their property applicants
CREATE POLICY "Landlords can view tenant profiles for applicants" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM property_applications pa
    JOIN properties p ON pa.property_id = p.id
    WHERE pa.tenant_id = profiles.id 
    AND p.owner_id = auth.uid()
  )
);