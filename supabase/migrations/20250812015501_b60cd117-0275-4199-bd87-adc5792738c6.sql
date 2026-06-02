-- Create landlord placement fees tracking table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.landlord_placement_fees (
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

-- Create indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_landlord_placement_fees_property_id ON public.landlord_placement_fees(property_id);
CREATE INDEX IF NOT EXISTS idx_landlord_placement_fees_landlord_id ON public.landlord_placement_fees(landlord_id);
CREATE INDEX IF NOT EXISTS idx_landlord_placement_fees_payment_status ON public.landlord_placement_fees(payment_status);
CREATE INDEX IF NOT EXISTS idx_landlord_placement_fees_due_date ON public.landlord_placement_fees(due_date);

-- Add property acquisition tracking fields to properties table (only if they don't exist)
DO $$ 
BEGIN
    -- Add recent_acquisition column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'recent_acquisition') THEN
        ALTER TABLE public.properties ADD COLUMN recent_acquisition BOOLEAN DEFAULT false;
    END IF;
    
    -- Add follow_up_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'follow_up_status') THEN
        ALTER TABLE public.properties ADD COLUMN follow_up_status TEXT DEFAULT 'none' CHECK (follow_up_status IN ('none', 'contacted', 'follow_up_needed', 'placement_discussed', 'fee_agreed'));
    END IF;
    
    -- Add acquisition_source column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'acquisition_source') THEN
        ALTER TABLE public.properties ADD COLUMN acquisition_source TEXT;
    END IF;
    
    -- Add outreach_notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'outreach_notes') THEN
        ALTER TABLE public.properties ADD COLUMN outreach_notes TEXT;
    END IF;
    
    -- Add last_outreach_date column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'properties' AND column_name = 'last_outreach_date') THEN
        ALTER TABLE public.properties ADD COLUMN last_outreach_date TIMESTAMP WITH TIME ZONE;
    END IF;
END
$$;

-- Create indexes for property tracking (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_properties_purchase_date ON public.properties(purchase_date);
CREATE INDEX IF NOT EXISTS idx_properties_recent_acquisition ON public.properties(recent_acquisition);

-- Enable Row Level Security on landlord_placement_fees
ALTER TABLE public.landlord_placement_fees ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for landlord_placement_fees (drop if exists, then create)
DROP POLICY IF EXISTS "Landlords can view their own placement fees" ON public.landlord_placement_fees;
CREATE POLICY "Landlords can view their own placement fees" 
ON public.landlord_placement_fees 
FOR SELECT 
USING (landlord_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all placement fees" ON public.landlord_placement_fees;
CREATE POLICY "Admins can view all placement fees" 
ON public.landlord_placement_fees 
FOR SELECT 
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "System can insert placement fees" ON public.landlord_placement_fees;
CREATE POLICY "System can insert placement fees" 
ON public.landlord_placement_fees 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage all placement fees" ON public.landlord_placement_fees;
CREATE POLICY "Admins can manage all placement fees" 
ON public.landlord_placement_fees 
FOR ALL 
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Landlords can update their own fees" ON public.landlord_placement_fees;
CREATE POLICY "Landlords can update their own fees" 
ON public.landlord_placement_fees 
FOR UPDATE 
USING (landlord_id = auth.uid());

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_landlord_placement_fees_updated_at ON public.landlord_placement_fees;
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
DROP TRIGGER IF EXISTS trigger_generate_placement_fee ON public.property_applications;
CREATE TRIGGER trigger_generate_placement_fee
AFTER UPDATE ON public.property_applications
FOR EACH ROW
EXECUTE FUNCTION public.generate_placement_fee_on_approval();