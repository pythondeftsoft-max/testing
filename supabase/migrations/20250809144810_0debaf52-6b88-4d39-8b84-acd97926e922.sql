-- Add unit-specific financial fields to property_units table
ALTER TABLE public.property_units 
ADD COLUMN additional_income numeric DEFAULT 0,
ADD COLUMN utility_costs numeric DEFAULT 0,
ADD COLUMN maintenance_costs numeric DEFAULT 0,
ADD COLUMN insurance_allocation numeric DEFAULT 0,
ADD COLUMN property_tax_allocation numeric DEFAULT 0,
ADD COLUMN management_fee_allocation numeric DEFAULT 0,
ADD COLUMN security_deposit_amount numeric DEFAULT 0;