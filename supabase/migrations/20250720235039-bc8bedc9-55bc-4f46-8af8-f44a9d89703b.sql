
-- Create account_invitations table for tracking user invitations
CREATE TABLE public.account_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role account_role_type NOT NULL,
  permissions TEXT,
  invited_by UUID REFERENCES auth.users(id),
  invitation_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64url'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending'
);

-- Enable Row Level Security
ALTER TABLE public.account_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for account invitations
CREATE POLICY "Account owners can manage invitations"
ON public.account_invitations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.account_roles ar
    WHERE ar.user_id = auth.uid() 
    AND ar.role_name IN ('owner', 'co_owner')
    AND ar.is_active = true
  )
);

CREATE POLICY "Invited users can view their invitations"
ON public.account_invitations
FOR SELECT
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_account_invitations_updated_at
BEFORE UPDATE ON public.account_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check if user is account admin
CREATE OR REPLACE FUNCTION public.is_account_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.account_roles
    WHERE user_id = $1 
    AND role_name IN ('owner', 'co_owner')
    AND is_active = true
  );
$$;
