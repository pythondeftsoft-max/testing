-- Remove duplicate foreign key constraint for property_id to fix relationship ambiguity
-- This resolves the "more than one relationship was found" error in Supabase queries

ALTER TABLE public.properties_for_sale 
DROP CONSTRAINT fk_properties_for_sale_property_id;