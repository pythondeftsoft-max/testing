-- Create property_units table for individual unit management
CREATE TABLE public.property_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  unit_name TEXT,
  monthly_rent NUMERIC,
  bedrooms INTEGER,
  bathrooms NUMERIC,
  square_feet INTEGER,
  status TEXT NOT NULL DEFAULT 'available', -- available, occupied, maintenance, unavailable
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lease_start_date DATE,
  lease_end_date DATE,
  unit_amenities TEXT[],
  unit_photos TEXT[],
  floor_number INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id, unit_number)
);

-- Enable RLS
ALTER TABLE public.property_units ENABLE ROW LEVEL SECURITY;

-- RLS Policies for property_units
CREATE POLICY "Property owners can manage their units"
  ON public.property_units
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE properties.id = property_units.property_id 
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can view available units"
  ON public.property_units
  FOR SELECT
  USING (status = 'available');

CREATE POLICY "Tenants can view their own units"
  ON public.property_units
  FOR SELECT
  USING (tenant_id = auth.uid());

-- Create trigger for updated_at
CREATE TRIGGER update_property_units_updated_at
  BEFORE UPDATE ON public.property_units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing properties to create default units
INSERT INTO public.property_units (
  property_id,
  unit_number,
  unit_name,
  monthly_rent,
  bedrooms,
  bathrooms,
  status,
  tenant_id,
  lease_start_date,
  lease_end_date,
  unit_amenities,
  unit_photos,
  description
)
SELECT 
  p.id,
  CASE 
    WHEN p.unit_count = 1 THEN 'Main Unit'
    ELSE 'Unit ' || generate_series(1, p.unit_count)
  END,
  CASE 
    WHEN p.unit_count = 1 THEN p.address
    ELSE p.address || ' - Unit ' || generate_series(1, p.unit_count)
  END,
  p.monthly_rent,
  p.bedrooms,
  p.bathrooms,
  CASE 
    WHEN p.status = 'occupied' AND generate_series(1, p.unit_count) = 1 THEN 'occupied'
    ELSE 'available'
  END,
  NULL, -- We'll handle tenant assignment separately
  p.lease_start_date,
  p.lease_end_date,
  p.amenities,
  p.photos,
  p.description
FROM public.properties p
CROSS JOIN generate_series(1, p.unit_count)
WHERE p.deleted_at IS NULL;

-- Create unit_applications table to replace property_applications for unit-specific applications
CREATE TABLE public.unit_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.property_units(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  priority_payment_made BOOLEAN NOT NULL DEFAULT false,
  priority_payment_amount NUMERIC DEFAULT 15.00,
  tenant_score INTEGER DEFAULT 5,
  application_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(unit_id, tenant_id)
);

-- Enable RLS
ALTER TABLE public.unit_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for unit_applications
CREATE POLICY "Property owners can manage applications for their units"
  ON public.unit_applications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.property_units pu
      JOIN public.properties p ON pu.property_id = p.id
      WHERE pu.id = unit_applications.unit_id 
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can create and view their own applications"
  ON public.unit_applications
  FOR ALL
  USING (tenant_id = auth.uid());

CREATE POLICY "Admins can view all unit applications"
  ON public.unit_applications
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_unit_applications_updated_at
  BEFORE UPDATE ON public.unit_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing property_applications to unit_applications
INSERT INTO public.unit_applications (
  unit_id,
  tenant_id,
  status,
  priority_payment_made,
  priority_payment_amount,
  tenant_score,
  created_at,
  updated_at
)
SELECT 
  pu.id,
  pa.tenant_id,
  pa.status,
  pa.priority_payment_made,
  pa.priority_payment_amount,
  pa.tenant_score,
  pa.created_at,
  pa.updated_at
FROM public.property_applications pa
JOIN public.property_units pu ON pu.property_id = pa.property_id
WHERE pu.unit_number = 'Main Unit' OR pu.unit_number = 'Unit 1';

-- Update maintenance_requests to reference units instead of properties
ALTER TABLE public.maintenance_requests 
ADD COLUMN unit_id UUID REFERENCES public.property_units(id) ON DELETE CASCADE;

-- Migrate existing maintenance requests to units
UPDATE public.maintenance_requests 
SET unit_id = pu.id
FROM public.property_units pu
WHERE pu.property_id = maintenance_requests.property_id
AND (pu.unit_number = 'Main Unit' OR pu.unit_number = 'Unit 1');

-- Update rent_payments to reference units
ALTER TABLE public.rent_payments
ADD COLUMN unit_id UUID REFERENCES public.property_units(id) ON DELETE CASCADE;

-- Migrate existing rent payments to units
UPDATE public.rent_payments
SET unit_id = pu.id
FROM public.property_units pu
WHERE pu.property_id = rent_payments.property_id
AND (pu.unit_number = 'Main Unit' OR pu.unit_number = 'Unit 1');

-- Create function to get unit vacancy status
CREATE OR REPLACE FUNCTION public.get_property_vacancy_summary(property_id_param UUID)
RETURNS TABLE(
  total_units INTEGER,
  available_units INTEGER,
  occupied_units INTEGER,
  maintenance_units INTEGER,
  vacancy_rate NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH unit_stats AS (
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
      COUNT(CASE WHEN status = 'occupied' THEN 1 END) as occupied,
      COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance
    FROM public.property_units
    WHERE property_id = property_id_param
  )
  SELECT 
    total::INTEGER,
    available::INTEGER,
    occupied::INTEGER,
    maintenance::INTEGER,
    CASE 
      WHEN total > 0 THEN (available::NUMERIC / total::NUMERIC * 100)
      ELSE 0 
    END as vacancy_rate
  FROM unit_stats;
END;
$$;