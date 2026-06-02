-- Update the properties_for_sale status check constraint to include admin interface values
ALTER TABLE public.properties_for_sale DROP CONSTRAINT IF EXISTS properties_for_sale_status_check;

-- Add new constraint with all status values used by the admin interface
ALTER TABLE public.properties_for_sale ADD CONSTRAINT properties_for_sale_status_check 
CHECK (status IN ('pending', 'active', 'reviewed', 'under_contract', 'sold', 'cancelled', 'withdrawn'));