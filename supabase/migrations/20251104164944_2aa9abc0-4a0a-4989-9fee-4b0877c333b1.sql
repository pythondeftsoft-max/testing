-- Create system admin invitations table
CREATE TABLE IF NOT EXISTS public.system_admin_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role_name public.system_admin_role_type NOT NULL,
  invitation_token UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.system_admin_invitations ENABLE ROW LEVEL SECURITY;

-- Create index on token for faster lookups
CREATE INDEX idx_system_admin_invitations_token ON public.system_admin_invitations(invitation_token);
CREATE INDEX idx_system_admin_invitations_email ON public.system_admin_invitations(email);
CREATE INDEX idx_system_admin_invitations_status ON public.system_admin_invitations(status);

-- Policy: System admins can view all invitations
CREATE POLICY "System admins can view all invitations"
  ON public.system_admin_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Policy: System admins can insert invitations
CREATE POLICY "System admins can create invitations"
  ON public.system_admin_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Policy: System admins can update invitations (for cancellation)
CREATE POLICY "System admins can update invitations"
  ON public.system_admin_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.system_admins
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Policy: Users can view their own pending invitations
CREATE POLICY "Users can view their own invitations"
  ON public.system_admin_invitations
  FOR SELECT
  TO authenticated
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND status = 'pending'
  );

-- Function to get pending invitations with inviter info
CREATE OR REPLACE FUNCTION public.get_pending_admin_invitations()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role_name TEXT,
  invitation_token UUID,
  invited_by UUID,
  inviter_email TEXT,
  inviter_name TEXT,
  notes TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.email,
    i.role_name::TEXT,
    i.invitation_token,
    i.invited_by,
    p.email as inviter_email,
    COALESCE(p.first_name || ' ' || p.last_name, p.email) as inviter_name,
    i.notes,
    i.status,
    i.expires_at,
    i.created_at
  FROM public.system_admin_invitations i
  LEFT JOIN public.profiles p ON p.id = i.invited_by
  WHERE i.status = 'pending'
  AND i.expires_at > now()
  ORDER BY i.created_at DESC;
END;
$$;

-- Function to cancel invitation
CREATE OR REPLACE FUNCTION public.cancel_admin_invitation(p_invitation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is a system admin
  IF NOT EXISTS (
    SELECT 1 FROM public.system_admins
    WHERE user_id = auth.uid()
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only system admins can cancel invitations';
  END IF;

  UPDATE public.system_admin_invitations
  SET status = 'cancelled'
  WHERE id = p_invitation_id
  AND status = 'pending';
END;
$$;

-- Function to mark expired invitations
CREATE OR REPLACE FUNCTION public.mark_expired_admin_invitations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count INTEGER;
BEGIN
  UPDATE public.system_admin_invitations
  SET status = 'expired'
  WHERE status = 'pending'
  AND expires_at < now();
  
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;