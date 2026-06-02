-- Create properties_for_sale table for wholesaling functionality
CREATE TABLE public.properties_for_sale (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  marketing_price NUMERIC NOT NULL,
  additional_details TEXT,
  reason_for_sale TEXT,
  timeline_for_sale TEXT,
  contact_preferences JSONB DEFAULT '{"email": true, "phone": false}'::jsonb,
  property_condition TEXT,
  selling_points TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'contacted', 'closed', 'withdrawn')),
  admin_notes TEXT,
  admin_contacted_at TIMESTAMP WITH TIME ZONE,
  admin_contacted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id, owner_id)
);

-- Enable RLS
ALTER TABLE public.properties_for_sale ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Property owners can manage their sale listings"
ON public.properties_for_sale
FOR ALL
USING (
  owner_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.properties p 
    WHERE p.id = properties_for_sale.property_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all sale listings"
ON public.properties_for_sale
FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update sale listings"
ON public.properties_for_sale
FOR UPDATE
USING (is_admin(auth.uid()));

-- Create updated_at trigger
CREATE TRIGGER update_properties_for_sale_updated_at
BEFORE UPDATE ON public.properties_for_sale
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add real-time support
ALTER TABLE public.properties_for_sale REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.properties_for_sale;