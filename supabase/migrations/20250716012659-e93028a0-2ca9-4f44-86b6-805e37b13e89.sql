
-- Add property_taxes field to properties table to complete monthly costs tracking
ALTER TABLE public.properties 
ADD COLUMN property_taxes numeric DEFAULT 0;

-- Add unit-level financial allocation fields to property_units table
ALTER TABLE public.property_units 
ADD COLUMN unit_mortgage_allocation numeric DEFAULT 0,
ADD COLUMN unit_insurance_allocation numeric DEFAULT 0,
ADD COLUMN unit_management_fee numeric DEFAULT 0,
ADD COLUMN unit_property_taxes_allocation numeric DEFAULT 0,
ADD COLUMN unit_maintenance_budget numeric DEFAULT 0;

-- Add comments for clarity
COMMENT ON COLUMN public.properties.property_taxes IS 'Monthly property taxes cost';
COMMENT ON COLUMN public.property_units.unit_mortgage_allocation IS 'Portion of mortgage payment allocated to this unit';
COMMENT ON COLUMN public.property_units.unit_insurance_allocation IS 'Portion of insurance cost allocated to this unit';
COMMENT ON COLUMN public.property_units.unit_management_fee IS 'Management fee specific to this unit';
COMMENT ON COLUMN public.property_units.unit_property_taxes_allocation IS 'Portion of property taxes allocated to this unit';
COMMENT ON COLUMN public.property_units.unit_maintenance_budget IS 'Maintenance budget allocation for this unit';
