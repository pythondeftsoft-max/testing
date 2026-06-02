
-- Create maintenance_requests table
CREATE TABLE public.maintenance_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'pending',
  submitted_date timestamp with time zone NOT NULL DEFAULT now(),
  completed_date timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Property owners can view maintenance requests for their properties"
  ON public.maintenance_requests
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id = maintenance_requests.property_id
    AND properties.owner_id = auth.uid()
  ));

CREATE POLICY "Property owners can update maintenance requests for their properties"
  ON public.maintenance_requests
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.properties
    WHERE properties.id = maintenance_requests.property_id
    AND properties.owner_id = auth.uid()
  ));

CREATE POLICY "Tenants can create maintenance requests"
  ON public.maintenance_requests
  FOR INSERT
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Tenants can view their own maintenance requests"
  ON public.maintenance_requests
  FOR SELECT
  USING (tenant_id = auth.uid());
