-- Create account_invitations table for managing user invitations
CREATE TABLE public.account_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES public.profiles(id),
  invitation_token TEXT NOT NULL UNIQUE DEFAULT generate_invitation_token(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending'
);

-- Enable Row Level Security
ALTER TABLE public.account_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for account invitations
CREATE POLICY "Admins can view all invitations"
ON public.account_invitations
FOR SELECT
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can create invitations"
ON public.account_invitations
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update invitations"
ON public.account_invitations
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Invited users can view their invitations by email"
ON public.account_invitations
FOR SELECT
TO authenticated
USING (email = get_user_email(auth.uid()));

CREATE POLICY "System can update invitations during acceptance"
ON public.account_invitations
FOR UPDATE
TO authenticated
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_account_invitations_updated_at
BEFORE UPDATE ON public.account_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to set invitation token
CREATE TRIGGER set_account_invitation_token
BEFORE INSERT ON public.account_invitations
FOR EACH ROW
EXECUTE FUNCTION public.set_invitation_token();