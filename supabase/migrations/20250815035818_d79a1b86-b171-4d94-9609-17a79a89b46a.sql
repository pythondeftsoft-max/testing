-- Phase 1c: Add trigger function for commercial rent calculation and documentation

-- Create trigger function to calculate monthly rent for commercial properties
CREATE OR REPLACE FUNCTION calculate_commercial_monthly_rent()
RETURNS TRIGGER AS $$
BEGIN
  -- Only calculate for commercial properties with square footage
  IF NEW.property_type = 'commercial' AND NEW.leasable_square_footage IS NOT NULL AND NEW.base_rent_psf IS NOT NULL THEN
    NEW.monthly_rent := (NEW.base_rent_psf * NEW.leasable_square_footage) / 12;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Create trigger for automatic commercial rent calculation
CREATE TRIGGER trigger_calculate_commercial_monthly_rent
  BEFORE INSERT OR UPDATE ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION calculate_commercial_monthly_rent();

-- Add comprehensive comments for documentation
COMMENT ON COLUMN public.properties.commercial_type IS 'Type of commercial property (office, retail, etc.)';
COMMENT ON COLUMN public.properties.commercial_subtype IS 'Specific subtype of commercial property';
COMMENT ON COLUMN public.properties.asset_tags IS 'Tags for categorizing and filtering assets';
COMMENT ON COLUMN public.properties.source_badge IS 'How this property was added to the system';
COMMENT ON COLUMN public.properties.is_multi_tenant IS 'Whether this property has multiple tenants';
COMMENT ON COLUMN public.properties.total_square_footage IS 'Total building square footage';
COMMENT ON COLUMN public.properties.leasable_square_footage IS 'Leasable square footage';
COMMENT ON COLUMN public.properties.base_rent_psf IS 'Base rent per square foot annually';
COMMENT ON COLUMN public.properties.cam_charges IS 'Common Area Maintenance charges';
COMMENT ON COLUMN public.properties.lease_type IS 'Type of lease structure (gross, net, etc.)';
COMMENT ON COLUMN public.properties.linked_business_holding_id IS 'Reference to associated business holding';
COMMENT ON COLUMN public.properties.asset_category IS 'High-level asset category for portfolio management';