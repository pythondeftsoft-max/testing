-- Add missing foreign key constraint between background_checks.tenant_id and profiles.id
ALTER TABLE public.background_checks 
ADD CONSTRAINT background_checks_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;