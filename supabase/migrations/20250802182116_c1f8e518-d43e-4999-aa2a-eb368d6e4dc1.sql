-- Add missing foreign key constraints to properties_for_sale table

-- Add foreign key constraint for owner_id referencing profiles table
ALTER TABLE public.properties_for_sale 
ADD CONSTRAINT fk_properties_for_sale_owner_id 
FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key constraint for property_id referencing properties table  
ALTER TABLE public.properties_for_sale 
ADD CONSTRAINT fk_properties_for_sale_property_id 
FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;