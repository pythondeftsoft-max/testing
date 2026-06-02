
-- Drop the existing portfolio_roles table and related objects if they exist
DROP TABLE IF EXISTS public.portfolio_roles CASCADE;
DROP TYPE IF EXISTS portfolio_role_type CASCADE;
DROP FUNCTION IF EXISTS public.has_portfolio_role(UUID, UUID, portfolio_role_type[]) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_portfolio_role(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.grant_portfolio_owner_role() CASCADE;

-- Create updated role enum that matches your requirements
CREATE TYPE portfolio_role_type AS ENUM (
  'admin_partner',
  'editor', 
  'viewer',
  'maintenance'
);

-- Create the portfolio_roles table with your specified structure
CREATE TABLE public.portfolio_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role_name portfolio_role_type NOT NULL,
  role_tag TEXT, -- Custom tag like 'Owner', 'Property Manager', 'Assistant', 'Investor', etc.
  added_by UUID REFERENCES public.profiles(id),
  permissions_level INTEGER NOT NULL DEFAULT 1, -- 1=lowest, 5=highest for fine-grained control
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique user-portfolio combinations (one role per user per portfolio)
  UNIQUE(portfolio_id, user_id)
);

-- Add RLS policies for portfolio_roles
ALTER TABLE public.portfolio_roles ENABLE ROW LEVEL SECURITY;

-- Portfolio admin_partners can view and manage all roles in their portfolios
CREATE POLICY "Portfolio admin_partners can manage portfolio roles" ON public.portfolio_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_roles pr
      WHERE pr.portfolio_id = portfolio_roles.portfolio_id
      AND pr.user_id = auth.uid()
      AND pr.role_name = 'admin_partner'
      AND pr.is_active = true
    )
  );

-- Users can view their own roles
CREATE POLICY "Users can view their own portfolio roles" ON public.portfolio_roles
  FOR SELECT USING (user_id = auth.uid());

-- Create function to check portfolio role (updated for new enum)
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
    AND role_name = ANY(p_roles)
    AND is_active = true
  );
$$;

-- Create function to get user's portfolio role (updated for new enum)
CREATE OR REPLACE FUNCTION public.get_user_portfolio_role(p_portfolio_id UUID, p_user_id UUID)
RETURNS portfolio_role_type
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role_name FROM public.portfolio_roles
  WHERE portfolio_id = p_portfolio_id
  AND user_id = p_user_id
  AND is_active = true
  ORDER BY 
    CASE role_name 
      WHEN 'admin_partner' THEN 1
      WHEN 'editor' THEN 2
      WHEN 'viewer' THEN 3
      WHEN 'maintenance' THEN 4
    END
  LIMIT 1;
$$;

-- Create trigger to automatically grant admin_partner role to portfolio creator
CREATE OR REPLACE FUNCTION public.grant_portfolio_admin_role()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.portfolio_roles (portfolio_id, user_id, role_name, added_by, permissions_level)
  VALUES (NEW.id, auth.uid(), 'admin_partner', auth.uid(), 5);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_portfolio_created
  AFTER INSERT ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_portfolio_admin_role();

-- Create updated_at trigger for portfolio_roles
CREATE TRIGGER update_portfolio_roles_updated_at
  BEFORE UPDATE ON public.portfolio_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing properties RLS policies to use the new portfolio roles structure
DROP POLICY IF EXISTS "Portfolio members can manage properties" ON public.properties;
CREATE POLICY "Portfolio members can manage properties" ON public.properties
  FOR ALL USING (
    portfolio_id IS NOT NULL AND 
    has_portfolio_role(portfolio_id, auth.uid(), ARRAY['admin_partner', 'editor']::portfolio_role_type[])
  );

-- Update property_applications RLS for portfolio-based access  
DROP POLICY IF EXISTS "Portfolio members can view property applications" ON public.property_applications;
CREATE POLICY "Portfolio members can view property applications" ON public.property_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_applications.property_id
      AND p.portfolio_id IS NOT NULL
      AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner', 'editor', 'viewer']::portfolio_role_type[])
    )
  );

DROP POLICY IF EXISTS "Portfolio managers can update property applications" ON public.property_applications;
CREATE POLICY "Portfolio managers can update property applications" ON public.property_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id = property_applications.property_id
      AND p.portfolio_id IS NOT NULL
      AND has_portfolio_role(p.portfolio_id, auth.uid(), ARRAY['admin_partner', 'editor']::portfolio_role_type[])
    )
  );
