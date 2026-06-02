-- Add signup_notes column to tenant_profiles table
ALTER TABLE public.tenant_profiles 
ADD COLUMN IF NOT EXISTS signup_notes TEXT;