
-- Check if account_invitations table exists and create if needed
CREATE TABLE IF NOT EXISTS public.account_invitations (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email text NOT NULL,
    role account_role_type NOT NULL,
    invited_by uuid REFERENCES auth.users(id) NOT NULL,
    invitation_token text NOT NULL DEFAULT generate_invitation_token(),
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '7 days'),
    accepted_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    notes text,
    status text NOT NULL DEFAULT 'pending'
);

-- Enable RLS
ALTER TABLE public.account_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for account invitations
CREATE POLICY "Account admins can manage account invitations" 
ON public.account_invitations 
FOR ALL 
USING (has_account_role(auth.uid(), ARRAY['owner'::account_role_type, 'admin_partner'::account_role_type]));

CREATE POLICY "Users can view invitations sent to their email" 
ON public.account_invitations 
FOR SELECT 
USING (true); -- Allow reading for invitation acceptance

-- Create unique constraint to prevent duplicate invitations
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_account_invitation 
ON public.account_invitations (email, role) 
WHERE status = 'pending';

-- Add trigger for updated_at
CREATE TRIGGER update_account_invitations_updated_at
    BEFORE UPDATE ON public.account_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
