-- Create account role types enum
CREATE TYPE account_role_type AS ENUM (
  'owner',
  'admin_partner', 
  'editor',
  'viewer',
  'maintenance'
);

-- Create account_roles table
CREATE TABLE public.account_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role_name account_role_type NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  added_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role_name)
);

-- Enable RLS
ALTER TABLE public.account_roles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Account owners can manage all account roles"
ON public.account_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.account_roles ar 
    WHERE ar.user_id = auth.uid() 
    AND ar.role_name = 'owner' 
    AND ar.is_active = true
  )
);

CREATE POLICY "Account admin_partners can manage non-owner roles"
ON public.account_roles
FOR ALL
USING (
  role_name != 'owner' AND
  EXISTS (
    SELECT 1 FROM public.account_roles ar 
    WHERE ar.user_id = auth.uid() 
    AND ar.role_name IN ('owner', 'admin_partner') 
    AND ar.is_active = true
  )
);

CREATE POLICY "Users can view account roles"
ON public.account_roles
FOR SELECT
USING (true);

-- Create function to check if user is account admin
CREATE OR REPLACE FUNCTION public.is_account_admin(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_roles 
    WHERE user_id = user_id_param 
    AND role_name IN ('owner', 'admin_partner')
    AND is_active = true
  );
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_account_roles_updated_at
BEFORE UPDATE ON public.account_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();