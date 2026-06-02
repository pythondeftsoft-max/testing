-- Update asset_recurring_charges table to allow 'weekly' and 'annually' cadences
ALTER TABLE public.asset_recurring_charges 
DROP CONSTRAINT IF EXISTS asset_recurring_charges_cadence_check;

ALTER TABLE public.asset_recurring_charges 
ADD CONSTRAINT asset_recurring_charges_cadence_check 
CHECK (cadence IN ('monthly', 'weekly', 'quarterly', 'annually', 'one-time'));