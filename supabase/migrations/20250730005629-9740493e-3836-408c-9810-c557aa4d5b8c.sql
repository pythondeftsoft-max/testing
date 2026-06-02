-- Add form_data field to background_checks table to store original submission data
ALTER TABLE public.background_checks 
ADD COLUMN form_data jsonb DEFAULT '{}'::jsonb;