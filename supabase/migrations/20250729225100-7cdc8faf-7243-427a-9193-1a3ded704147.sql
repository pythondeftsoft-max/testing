-- Create background_checks table for tenant screening
CREATE TABLE public.background_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  property_id UUID,
  initiated_by UUID NOT NULL,
  check_status TEXT NOT NULL DEFAULT 'pending',
  check_type TEXT NOT NULL DEFAULT 'basic',
  results_json JSONB DEFAULT '{}',
  cost NUMERIC DEFAULT 0,
  initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable Row Level Security
ALTER TABLE public.background_checks ENABLE ROW LEVEL SECURITY;

-- Create policies for background checks
CREATE POLICY "Property owners can manage background checks for their properties"
ON public.background_checks
FOR ALL
USING (
  initiated_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM properties
    WHERE properties.id = background_checks.property_id
    AND properties.owner_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_background_checks_updated_at
BEFORE UPDATE ON public.background_checks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();