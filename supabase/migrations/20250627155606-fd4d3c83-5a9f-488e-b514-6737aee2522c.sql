

-- Create enum for user types
CREATE TYPE public.user_type AS ENUM ('admin', 'landlord', 'property_manager', 'individual_owner');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  user_type public.user_type NOT NULL DEFAULT 'individual_owner',
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Create tenant applications table
CREATE TABLE public.tenant_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  state TEXT,
  has_voucher BOOLEAN NOT NULL DEFAULT false,
  voucher_amount DECIMAL(10,2),
  documentation_url TEXT,
  priority_payment_made BOOLEAN NOT NULL DEFAULT false,
  priority_payment_amount DECIMAL(10,2) DEFAULT 15.00,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create portfolios table for property managers
CREATE TABLE public.portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create properties table
CREATE TABLE public.properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE SET NULL,
  address TEXT NOT NULL,
  unit_count INTEGER NOT NULL DEFAULT 1,
  monthly_rent DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'vacant',
  lease_start_date DATE,
  lease_end_date DATE,
  photos TEXT[], -- Array of photo URLs
  insurance_cost DECIMAL(10,2) DEFAULT 0,
  mortgage_cost DECIMAL(10,2) DEFAULT 0,
  management_fee DECIMAL(10,2) DEFAULT 0,
  repair_costs DECIMAL(10,2) DEFAULT 0,
  for_sale BOOLEAN NOT NULL DEFAULT false,
  sale_price DECIMAL(12,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND user_type = 'admin'
  );
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
  ON public.profiles 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" 
  ON public.profiles 
  FOR SELECT 
  USING (public.is_admin(auth.uid()));

-- RLS Policies for tenant applications
CREATE POLICY "Admins can view all tenant applications" 
  ON public.tenant_applications 
  FOR ALL 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Allow public tenant application creation" 
  ON public.tenant_applications 
  FOR INSERT 
  WITH CHECK (true);

-- RLS Policies for portfolios
CREATE POLICY "Property managers can view their portfolios" 
  ON public.portfolios 
  FOR SELECT 
  USING (manager_id = auth.uid());

CREATE POLICY "Property managers can manage their portfolios" 
  ON public.portfolios 
  FOR ALL 
  USING (manager_id = auth.uid());

CREATE POLICY "Admins can view all portfolios" 
  ON public.portfolios 
  FOR SELECT 
  USING (public.is_admin(auth.uid()));

-- RLS Policies for properties
CREATE POLICY "Owners can view their properties" 
  ON public.properties 
  FOR SELECT 
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can manage their properties" 
  ON public.properties 
  FOR ALL 
  USING (owner_id = auth.uid());

CREATE POLICY "Property managers can view portfolio properties" 
  ON public.properties 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios 
      WHERE id = portfolio_id AND manager_id = auth.uid()
    )
  );

CREATE POLICY "Property managers can manage portfolio properties" 
  ON public.properties 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolios 
      WHERE id = portfolio_id AND manager_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all properties" 
  ON public.properties 
  FOR SELECT 
  USING (public.is_admin(auth.uid()));

CREATE POLICY "All authenticated users can view properties for sale" 
  ON public.properties 
  FOR SELECT 
  USING (for_sale = true AND auth.uid() IS NOT NULL);

-- Create trigger function to handle new user profiles
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

  -- If this is a demo landlord account, create sample properties
  IF NEW.email = 'landlord@openkey.com' THEN
    -- Add sample properties for the demo landlord
    INSERT INTO public.properties (
      owner_id,
      address,
      unit_count,
      monthly_rent,
      status,
      insurance_cost,
      mortgage_cost,
      management_fee,
      repair_costs
    ) VALUES (
      NEW.id,
      '123 Main Street, Springfield, IL 62701',
      1,
      1200.00,
      'occupied',
      150.00,
      800.00,
      120.00,
      50.00
    ),
    (
      NEW.id,
      '456 Oak Avenue, Springfield, IL 62702',
      2,
      1800.00,
      'vacant',
      200.00,
      1200.00,
      180.00,
      100.00
    );
  END IF;

  -- If this is the first admin account created, add sample tenant applications
  IF NEW.email = 'admin@openkey.com' THEN
    INSERT INTO public.tenant_applications (
      name,
      email,
      phone,
      state,
      has_voucher,
      voucher_amount,
      status,
      priority_payment_made
    ) VALUES (
      'John Smith',
      'john.smith@email.com',
      '555-1234',
      'Illinois',
      true,
      1100.00,
      'pending',
      true
    ),
    (
      'Maria Garcia',
      'maria.garcia@email.com',
      '555-5678',
      'Illinois',
      true,
      950.00,
      'approved',
      false
    ),
    (
      'Robert Johnson',
      'robert.johnson@email.com',
      '555-9012',
      'Illinois',
      false,
      null,
      'pending',
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

