-- Add application_id column to landlord_placement_fees table
ALTER TABLE public.landlord_placement_fees
ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES public.property_applications(id);