-- Fix missing CASCADE constraint on hap_payments table
-- This allows properties with HAP payment records to be deleted properly

-- Drop the existing foreign key constraint
ALTER TABLE public.hap_payments 
DROP CONSTRAINT IF EXISTS hap_payments_property_id_fkey;

-- Re-add it with ON DELETE CASCADE
ALTER TABLE public.hap_payments 
ADD CONSTRAINT hap_payments_property_id_fkey 
FOREIGN KEY (property_id) 
REFERENCES public.properties(id) 
ON DELETE CASCADE;

-- Add comment explaining the cascade behavior
COMMENT ON CONSTRAINT hap_payments_property_id_fkey ON public.hap_payments IS 
'Cascade deletes HAP payment records when parent property is deleted';