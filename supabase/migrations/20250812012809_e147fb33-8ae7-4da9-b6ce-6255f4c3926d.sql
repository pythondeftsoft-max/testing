-- Create landlord placement fees tracking table
CREATE TABLE public.landlord_placement_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL,
  landlord_id UUID NOT NULL,
  tenant_id UUID,
  fee_amount NUMERIC NOT NULL,
  first_month_rent NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'waived')),
  payment_date DATE,
  payment_method TEXT,
  follow_up_status TEXT DEFAULT 'none' CHECK (follow_up_status IN ('none', 'reminder_sent', 'second_reminder', 'final_notice', 'collections')),
  last_reminder_sent TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  stripe_payment_intent_id TEXT,
  waived_by UUID,
  waived_reason TEXT,
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE,
  FOREIGN KEY (landlord_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (waived_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Create indexes for better performance
CREATE INDEX idx_landlord_placement_fees_property_id ON public.landlord_placement_fees(property_id);
CREATE INDEX idx_landlord_placement_fees_landlord_id ON public.landlord_placement_fees(landlord_id);
CREATE INDEX idx_landlord_placement_fees_payment_status ON public.landlord_placement_fees(payment_status);
CREATE INDEX idx_landlord_placement_fees_due_date ON public.landlord_placement_fees(due_date);

-- Add property acquisition tracking fields to properties table
ALTER TABLE public.properties 
ADD COLUMN purchase_date DATE,
ADD COLUMN recent_acquisition BOOLEAN DEFAULT false,
ADD COLUMN follow_up_status TEXT DEFAULT 'none' CHECK (follow_up_status IN ('none', 'contacted', 'follow_up_needed', 'placement_discussed', 'fee_agreed')),
ADD COLUMN acquisition_source TEXT,
ADD COLUMN outreach_notes TEXT,
ADD COLUMN last_outreach_date TIMESTAMP WITH TIME ZONE;

-- Create index for recent acquisitions
CREATE INDEX idx_properties_purchase_date ON public.properties(purchase_date);
CREATE INDEX idx_properties_recent_acquisition ON public.properties(recent_acquisition);

-- Enable Row Level Security
ALTER TABLE public.landlord_placement_fees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for landlord_placement_fees
CREATE POLICY "Landlords can view their own placement fees" 
ON public.landlord_placement_fees 
FOR SELECT 
USING (landlord_id = auth.uid());

CREATE POLICY "Admins can view all placement fees" 
ON public.landlord_placement_fees 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "System can insert placement fees" 
ON public.landlord_placement_fees 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can manage all placement fees" 
ON public.landlord_placement_fees 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Landlords can update their own fees" 
ON public.landlord_placement_fees 
FOR UPDATE 
USING (landlord_id = auth.uid());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_landlord_placement_fees_updated_at
BEFORE UPDATE ON public.landlord_placement_fees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically generate placement fees
CREATE OR REPLACE FUNCTION public.generate_placement_fee_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  property_rent NUMERIC;
  landlord_id_var UUID;
BEGIN
  -- Only trigger when status changes to 'approved'
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get property rent and landlord ID
    SELECT monthly_rent, owner_id INTO property_rent, landlord_id_var
    FROM properties 
    WHERE id = NEW.property_id;
    
    -- Insert placement fee record
    INSERT INTO public.landlord_placement_fees (
      property_id,
      landlord_id,
      tenant_id,
      fee_amount,
      first_month_rent,
      due_date
    ) VALUES (
      NEW.property_id,
      landlord_id_var,
      NEW.tenant_id,
      ROUND(property_rent * 0.4, 2), -- 40% of first month's rent
      property_rent,
      CURRENT_DATE + INTERVAL '3 days' -- Due in 3 business days
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on property_applications
CREATE TRIGGER trigger_generate_placement_fee
AFTER UPDATE ON public.property_applications
FOR EACH ROW
EXECUTE FUNCTION public.generate_placement_fee_on_approval();

-- Create function to mark recent acquisitions
CREATE OR REPLACE FUNCTION public.mark_recent_acquisitions()
RETURNS void AS $$
BEGIN
  UPDATE public.properties 
  SET recent_acquisition = true
  WHERE purchase_date >= CURRENT_DATE - INTERVAL '90 days'
    AND recent_acquisition = false;
    
  UPDATE public.properties 
  SET recent_acquisition = false
  WHERE purchase_date < CURRENT_DATE - INTERVAL '90 days'
    AND recent_acquisition = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;