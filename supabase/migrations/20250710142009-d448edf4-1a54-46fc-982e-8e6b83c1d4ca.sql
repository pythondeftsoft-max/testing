-- Add missing RLS policies for unit_applications table

-- Allow tenants to insert their own unit applications
CREATE POLICY "Tenants can create unit applications" 
ON public.unit_applications 
FOR INSERT 
WITH CHECK (tenant_id = auth.uid());

-- Allow tenants to view their own unit applications
CREATE POLICY "Tenants can view their own unit applications" 
ON public.unit_applications 
FOR SELECT 
USING (tenant_id = auth.uid());

-- Allow property owners to view unit applications for their properties
CREATE POLICY "Property owners can view unit applications for their properties" 
ON public.unit_applications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.property_units pu
  JOIN public.properties p ON pu.property_id = p.id
  WHERE pu.id = unit_applications.unit_id 
  AND p.owner_id = auth.uid()
));

-- Allow property owners to update unit applications for their properties
CREATE POLICY "Property owners can update unit applications for their properties" 
ON public.unit_applications 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.property_units pu
  JOIN public.properties p ON pu.property_id = p.id
  WHERE pu.id = unit_applications.unit_id 
  AND p.owner_id = auth.uid()
));