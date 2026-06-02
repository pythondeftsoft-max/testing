
-- Create portfolio role enum
CREATE TYPE portfolio_role_type AS ENUM (
  'portfolio_owner',
  'editor', 
  'manager',
  'viewer',
  'maintenance_contact'
);

-- Create portfolio_roles table
CREATE TABLE public.portfolio_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role portfolio_role_type NOT NULL,
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique user-portfolio-role combinations
  UNIQUE(portfolio_id, user_id, role)
);

-- Add RLS policies for portfolio_roles
ALTER TABLE public.portfolio_roles ENABLE ROW LEVEL SECURITY;

-- Portfolio owners and editors can view all roles in their portfolios
CREATE POLICY "Portfolio managers can view portfolio roles" ON public.portfolio_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_roles pr
      WHERE pr.portfolio_id = portfolio_roles.portfolio_id
      AND pr.user_id = auth.uid()
      AND pr.role IN ('portfolio_owner', 'editor', 'manager')
      AND pr.is_active = true
    )
  );

-- Users can view their own roles
CREATE POLICY "Users can view their own portfolio roles" ON public.portfolio_roles
  FOR SELECT USING (user_id = auth.uid());

-- Only portfolio owners can manage roles
CREATE POLICY "Portfolio owners can manage roles" ON public.portfolio_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_roles pr
      WHERE pr.portfolio_id = portfolio_roles.portfolio_id
      AND pr.user_id = auth.uid()
      AND pr.role = 'portfolio_owner'
      AND pr.is_active = true
    )
  );

-- Admins can manage all roles
CREATE POLICY "Admins can manage all portfolio roles" ON public.portfolio_roles
  FOR ALL USING (is_admin(auth.uid()));

-- Modify portfolios table to remove manager_id and add owner_id
ALTER TABLE public.portfolios DROP COLUMN IF EXISTS manager_id;
ALTER TABLE public.portfolios ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id);

-- Create function to check portfolio role
CREATE OR REPLACE FUNCTION public.has_portfolio_role(p_portfolio_id UUID, p_user_id UUID, p_roles portfolio_role_type[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portfolio_roles
    WHERE portfolio_id = p_portfolio_id
    AND user_id = p_user_id
    AND role = ANY(p_roles)
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Create function to get user's portfolio role
CREATE OR REPLACE FUNCTION public.get_user_portfolio_role(p_portfolio_id UUID, p_user_id UUID)
RETURNS portfolio_role_type
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.portfolio_roles
  WHERE portfolio_id = p_portfolio_id
  AND user_id = p_user_id
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  ORDER BY 
    CASE role 
      WHEN 'portfolio_owner' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'editor' THEN 3
      WHEN 'viewer' THEN 4
      WHEN 'maintenance_contact' THEN 5
    END
  LIMIT 1;
$$;

-- Update properties RLS policies to use portfolio roles
DROP POLICY IF EXISTS "Property owners can manage their properties" ON public.properties;
CREATE POLICY "Portfolio members can manage properties" ON public.properties
  FOR ALL USING (
    portfolio_id IS NOT NULL AND 
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['portfolio_owner', 'manager', 'editor']::portfolio_role_type[])
  );

-- Update property_applications RLS for portfolio-based access
DROP POLICY IF EXISTS "Property owners can view applications for their properties" ON public.property_applications;
CREATE POLICY "Portfolio members can view property applications" ON public.property_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_applications.property_id
      AND p.portfolio_id IS NOT NULL
      AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['portfolio_owner', 'manager', 'editor', 'viewer']::portfolio_role_type[])
    )
  );

DROP POLICY IF EXISTS "Property owners can update applications for their properties" ON public.property_applications;
CREATE POLICY "Portfolio managers can update property applications" ON public.property_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_applications.property_id
      AND p.portfolio_id IS NOT NULL
      AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['portfolio_owner', 'manager', 'editor']::portfolio_role_type[])
    )
  );

-- Create trigger to automatically grant portfolio_owner role to portfolio creator
CREATE OR REPLACE FUNCTION public.grant_portfolio_owner_role()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.portfolio_roles (portfolio_id, user_id, role, granted_by)
  VALUES (NEW.id, auth.uid(), 'portfolio_owner', auth.uid());
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_portfolio_created
  AFTER INSERT ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_portfolio_owner_role();

-- Create updated_at trigger for portfolio_roles
CREATE TRIGGER update_portfolio_roles_updated_at
  BEFORE UPDATE ON public.portfolio_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
