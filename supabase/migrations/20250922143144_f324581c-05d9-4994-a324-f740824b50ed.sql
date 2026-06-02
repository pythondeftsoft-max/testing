-- Add foreign key constraints for tenant_insurance table to fix join relationships

-- First, let's ensure the tenant_insurance table has proper foreign key relationships
-- This will allow PostgREST to automatically detect relationships for joins

-- Add foreign key constraint from tenant_insurance.tenant_id to profiles.id
ALTER TABLE public.tenant_insurance 
ADD CONSTRAINT fk_tenant_insurance_tenant_id 
FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint from tenant_insurance.property_id to properties.id  
ALTER TABLE public.tenant_insurance 
ADD CONSTRAINT fk_tenant_insurance_property_id 
FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- Create index for better performance on foreign key lookups
CREATE INDEX IF NOT EXISTS idx_tenant_insurance_tenant_id ON public.tenant_insurance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_insurance_property_id ON public.tenant_insurance(property_id);

-- Add some sample data for testing if the table is empty
INSERT INTO public.tenant_insurance (
  tenant_id,
  property_id, 
  provider_name,
  policy_number,
  policy_type,
  liability_coverage,
  personal_property_coverage,
  effective_date,
  expiration_date,
  premium_amount,
  is_active
) 
SELECT 
  p.id as tenant_id,
  props.id as property_id,
  'Sample Insurance Co.' as provider_name,
  'POL-' || SUBSTR(md5(random()::text), 1, 8) as policy_number,
  'msi' as policy_type,
  100000 as liability_coverage,
  25000 as personal_property_coverage,
  CURRENT_DATE - INTERVAL '30 days' as effective_date,
  CURRENT_DATE + INTERVAL '11 months' as expiration_date,
  75.00 as premium_amount,
  true as is_active
FROM public.profiles p
JOIN public.properties props ON props.owner_id != p.id
WHERE p.user_type = 'tenant' 
AND NOT EXISTS (
  SELECT 1 FROM public.tenant_insurance ti 
  WHERE ti.tenant_id = p.id AND ti.property_id = props.id
)
LIMIT 3;