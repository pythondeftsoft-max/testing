-- Create tenant_properties table for durable tenant-to-property connections
CREATE TABLE public.tenant_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  property_id UUID NOT NULL,
  application_id UUID NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  disconnected_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  lease_start_date DATE,
  lease_end_date DATE,
  monthly_rent NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, property_id, application_id)
);

-- Enable RLS
ALTER TABLE public.tenant_properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenants can view their own property connections" 
ON public.tenant_properties 
FOR SELECT 
USING (tenant_id = auth.uid());

CREATE POLICY "Property owners can view connections for their properties" 
ON public.tenant_properties 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.properties 
  WHERE properties.id = tenant_properties.property_id 
  AND properties.owner_id = auth.uid()
));

CREATE POLICY "System can manage tenant property connections" 
ON public.tenant_properties 
FOR ALL 
USING (true);

-- Trigger function to create tenant_properties record when application is approved
CREATE OR REPLACE FUNCTION public.create_tenant_property_connection()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get property details for the connection
    INSERT INTO public.tenant_properties (
      tenant_id,
      property_id,
      application_id,
      lease_start_date,
      lease_end_date,
      monthly_rent
    )
    SELECT 
      NEW.tenant_id,
      NEW.property_id,
      NEW.id,
      p.lease_start_date,
      p.lease_end_date,
      p.monthly_rent
    FROM public.properties p
    WHERE p.id = NEW.property_id
    ON CONFLICT (tenant_id, property_id, application_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER create_tenant_property_connection_trigger
  AFTER INSERT OR UPDATE ON public.property_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.create_tenant_property_connection();

-- Add updated_at trigger
CREATE TRIGGER update_tenant_properties_updated_at
  BEFORE UPDATE ON public.tenant_properties
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();