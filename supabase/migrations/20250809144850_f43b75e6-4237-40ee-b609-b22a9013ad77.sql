-- Add missing unit-specific financial fields to property_units table
ALTER TABLE public.property_units 
ADD COLUMN IF NOT EXISTS additional_income numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS security_deposit_amount numeric DEFAULT 0;