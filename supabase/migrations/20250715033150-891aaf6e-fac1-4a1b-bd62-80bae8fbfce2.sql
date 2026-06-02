-- Create function to automatically create rent splits when applications are approved
CREATE OR REPLACE FUNCTION public.create_rent_split_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only proceed if status changed to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Create rent split record using property and tenant data
    INSERT INTO public.rent_splits (
      property_id,
      tenant_id, 
      total_rent,
      pha_portion,
      tenant_portion,
      effective_date,
      voucher_type,
      is_active
    )
    SELECT 
      NEW.property_id,
      NEW.tenant_id,
      p.monthly_rent,
      -- Calculate portions based on property voucher settings
      CASE 
        WHEN p.has_voucher = true AND p.voucher_type IS NOT NULL THEN 
          COALESCE(p.pha_payment_standard, p.monthly_rent * 0.6)
        ELSE 0
      END,
      CASE 
        WHEN p.has_voucher = true AND p.voucher_type IS NOT NULL THEN 
          p.monthly_rent - COALESCE(p.pha_payment_standard, p.monthly_rent * 0.6)
        ELSE p.monthly_rent
      END,
      CURRENT_DATE,
      p.voucher_type,
      true
    FROM properties p 
    WHERE p.id = NEW.property_id
    -- Only create if rent split doesn't already exist for this property/tenant combo
    AND NOT EXISTS (
      SELECT 1 FROM public.rent_splits rs 
      WHERE rs.property_id = NEW.property_id 
        AND rs.tenant_id = NEW.tenant_id 
        AND rs.is_active = true
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on property_applications table
CREATE TRIGGER trigger_create_rent_split_on_approval
  AFTER UPDATE ON public.property_applications
  FOR EACH ROW 
  EXECUTE FUNCTION public.create_rent_split_on_approval();

-- Clean up existing rent_splits to match approved applications
UPDATE public.rent_splits 
SET tenant_id = pa.tenant_id,
    updated_at = NOW()
FROM public.property_applications pa
WHERE rent_splits.property_id = pa.property_id 
  AND pa.status = 'approved'
  AND rent_splits.tenant_id != pa.tenant_id;