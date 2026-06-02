-- Add missing columns to property_units table for unit-level tenant requests
ALTER TABLE public.property_units 
ADD COLUMN move_in_date DATE,
ADD COLUMN photos TEXT[] DEFAULT '{}',
ADD COLUMN video_tour_url TEXT;