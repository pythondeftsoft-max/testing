
-- Add subscription and payment tracking tables
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL, -- 'landlord_basic', 'landlord_premium', 'tenant_premium'
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'expired'
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add application queue table for tenant applications to properties
CREATE TABLE public.property_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  priority_payment_made BOOLEAN NOT NULL DEFAULT false,
  priority_payment_amount DECIMAL(10,2) DEFAULT 15.00,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'withdrawn'
  tenant_score INTEGER DEFAULT 5 CHECK (tenant_score >= 1 AND tenant_score <= 10),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id, tenant_id)
);

-- Add tenant profiles for detailed rental information
CREATE TABLE public.tenant_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  monthly_income DECIMAL(12,2),
  employment_status TEXT,
  credit_score INTEGER,
  reference_contacts TEXT[], -- Array of reference contact info
  documents_uploaded BOOLEAN DEFAULT false,
  voucher_holder BOOLEAN DEFAULT false,
  voucher_amount DECIMAL(10,2),
  preferred_move_date DATE,
  max_rent DECIMAL(10,2),
  preferred_locations TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add messages table for landlord-tenant communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_application_id UUID REFERENCES public.property_applications(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add viewing appointments table
CREATE TABLE public.viewing_appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  landlord_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  viewing_type TEXT NOT NULL DEFAULT 'virtual', -- 'virtual', 'in_person'
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add property search filters
ALTER TABLE public.properties ADD COLUMN bedrooms INTEGER;
ALTER TABLE public.properties ADD COLUMN bathrooms DECIMAL(3,1);
ALTER TABLE public.properties ADD COLUMN zipcode TEXT;
ALTER TABLE public.properties ADD COLUMN description TEXT;
ALTER TABLE public.properties ADD COLUMN amenities TEXT[];

-- Enable RLS on all new tables
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewing_appointments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscriptions" 
  ON public.subscriptions 
  FOR SELECT 
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own subscriptions" 
  ON public.subscriptions 
  FOR ALL 
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all subscriptions" 
  ON public.subscriptions 
  FOR SELECT 
  USING (public.is_admin(auth.uid()));

-- RLS Policies for property applications
CREATE POLICY "Tenants can view their own applications" 
  ON public.property_applications 
  FOR SELECT 
  USING (tenant_id = auth.uid());

CREATE POLICY "Property owners can view applications for their properties" 
  ON public.property_applications 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Tenants can create applications" 
  ON public.property_applications 
  FOR INSERT 
  WITH CHECK (tenant_id = auth.uid());

CREATE POLICY "Property owners can update applications for their properties" 
  ON public.property_applications 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.properties 
      WHERE id = property_id AND owner_id = auth.uid()
    )
  );

-- RLS Policies for tenant profiles
CREATE POLICY "Users can view their own tenant profile" 
  ON public.tenant_profiles 
  FOR ALL 
  USING (user_id = auth.uid());

CREATE POLICY "Property owners can view tenant profiles of applicants" 
  ON public.tenant_profiles 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.property_applications pa
      JOIN public.properties p ON pa.property_id = p.id
      WHERE pa.tenant_id = tenant_profiles.user_id 
      AND p.owner_id = auth.uid()
    )
  );

-- RLS Policies for messages
CREATE POLICY "Users can view messages for their applications" 
  ON public.messages 
  FOR SELECT 
  USING (
    sender_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.property_applications pa
      WHERE pa.id = property_application_id 
      AND (pa.tenant_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.properties p 
        WHERE p.id = pa.property_id AND p.owner_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Users can send messages for their applications" 
  ON public.messages 
  FOR INSERT 
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.property_applications pa
      WHERE pa.id = property_application_id 
      AND (pa.tenant_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.properties p 
        WHERE p.id = pa.property_id AND p.owner_id = auth.uid()
      ))
    )
  );

-- RLS Policies for viewing appointments
CREATE POLICY "Users can view their own viewing appointments" 
  ON public.viewing_appointments 
  FOR SELECT 
  USING (tenant_id = auth.uid() OR landlord_id = auth.uid());

CREATE POLICY "Users can manage their own viewing appointments" 
  ON public.viewing_appointments 
  FOR ALL 
  USING (tenant_id = auth.uid() OR landlord_id = auth.uid());

-- Update handle_new_user function to handle tenant profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    user_type, 
    company_name, 
    phone
  )
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE((NEW.raw_user_meta_data ->> 'user_type')::public.user_type, 'individual_owner'),
    NEW.raw_user_meta_data ->> 'company_name',
    NEW.raw_user_meta_data ->> 'phone'
  );

  -- Create tenant profile if user type is tenant
  IF COALESCE((NEW.raw_user_meta_data ->> 'user_type')::public.user_type, 'individual_owner') = 'individual_owner' THEN
    INSERT INTO public.tenant_profiles (user_id) VALUES (NEW.id);
  END IF;

  -- Demo data creation for existing demo accounts
  IF NEW.email = 'landlord@openkey.com' THEN
    INSERT INTO public.properties (
      owner_id, address, unit_count, monthly_rent, status,
      insurance_cost, mortgage_cost, management_fee, repair_costs,
      bedrooms, bathrooms, zipcode, description
    ) VALUES (
      NEW.id, '123 Main Street, Springfield, IL 62701', 1, 1200.00, 'occupied',
      150.00, 800.00, 120.00, 50.00, 2, 1.0, '62701', 'Cozy 2-bedroom apartment'
    ),
    (
      NEW.id, '456 Oak Avenue, Springfield, IL 62702', 2, 1800.00, 'vacant',
      200.00, 1200.00, 180.00, 100.00, 3, 2.0, '62702', 'Spacious 3-bedroom unit'
    );
  END IF;

  IF NEW.email = 'admin@openkey.com' THEN
    INSERT INTO public.tenant_applications (
      name, email, phone, state, has_voucher, voucher_amount, status, priority_payment_made
    ) VALUES (
      'John Smith', 'john.smith@email.com', '555-1234', 'Illinois',
      true, 1100.00, 'pending', true
    ),
    (
      'Maria Garcia', 'maria.garcia@email.com', '555-5678', 'Illinois',
      true, 950.00, 'approved', false
    );
  END IF;

  RETURN NEW;
END;
$$;
