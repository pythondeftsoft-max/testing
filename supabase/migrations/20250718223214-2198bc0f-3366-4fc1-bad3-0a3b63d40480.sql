
-- Fix infinite recursion in portfolio_roles RLS policy
DROP POLICY IF EXISTS "Portfolio admin_partners can manage portfolio roles" ON public.portfolio_roles;

-- Create a security definer function to safely check portfolio ownership
CREATE OR REPLACE FUNCTION public.is_portfolio_owner(p_portfolio_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.portfolios
    WHERE id = p_portfolio_id
    AND manager_id = p_user_id
  );
$$;

-- Create new RLS policy that avoids self-referencing portfolio_roles table
CREATE POLICY "Portfolio owners and admin_partners can manage portfolio roles" ON public.portfolio_roles
  FOR ALL USING (
    -- Allow portfolio owners (via portfolios table)
    is_portfolio_owner(portfolio_id, auth.uid())
    OR
    -- Allow existing admin_partners (but only for non-recursive operations)
    EXISTS (
      SELECT 1 FROM public.portfolio_roles pr
      WHERE pr.portfolio_id = portfolio_roles.portfolio_id
      AND pr.user_id = auth.uid()
      AND pr.role_name = 'admin_partner'
      AND pr.is_active = true
      AND pr.id != portfolio_roles.id  -- Prevent self-reference
    )
  );

-- Fix the portfolio_invitations table schema to match what the edge function expects
-- Check if columns exist first to avoid errors
DO $$
BEGIN
  -- Add inviter_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'portfolio_invitations' 
                 AND column_name = 'inviter_id') THEN
    ALTER TABLE public.portfolio_invitations ADD COLUMN inviter_id UUID REFERENCES public.profiles(id);
  END IF;
  
  -- Add role column if it doesn't exist  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'portfolio_invitations' 
                 AND column_name = 'role') THEN
    ALTER TABLE public.portfolio_invitations ADD COLUMN role portfolio_role_type;
  END IF;
END
$$;

-- Copy data from old columns to new columns if they exist
DO $$
BEGIN
  -- Copy invited_by to inviter_id if both columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'portfolio_invitations' 
             AND column_name = 'invited_by') AND
     EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'portfolio_invitations' 
             AND column_name = 'inviter_id') THEN
    UPDATE public.portfolio_invitations 
    SET inviter_id = invited_by 
    WHERE inviter_id IS NULL AND invited_by IS NOT NULL;
  END IF;
  
  -- Copy role_name to role if both columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'portfolio_invitations' 
             AND column_name = 'role_name') AND
     EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'portfolio_invitations' 
             AND column_name = 'role') THEN
    UPDATE public.portfolio_invitations 
    SET role = role_name::portfolio_role_type 
    WHERE role IS NULL AND role_name IS NOT NULL;
  END IF;
END
$$;

-- Add debugging function to check invitation creation
CREATE OR REPLACE FUNCTION public.debug_portfolio_invitation(
  p_portfolio_id uuid,
  p_invited_email text,
  p_inviter_id uuid,
  p_role portfolio_role_type
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  portfolio_exists boolean;
  inviter_exists boolean;
  inviter_role portfolio_role_type;
BEGIN
  -- Check if portfolio exists
  SELECT EXISTS(SELECT 1 FROM public.portfolios WHERE id = p_portfolio_id) INTO portfolio_exists;
  
  -- Check if inviter exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_inviter_id) INTO inviter_exists;
  
  -- Get inviter's role in the portfolio
  SELECT pr.role_name INTO inviter_role
  FROM public.portfolio_roles pr
  WHERE pr.portfolio_id = p_portfolio_id
  AND pr.user_id = p_inviter_id
  AND pr.is_active = true;
  
  -- Build debug result
  result := jsonb_build_object(
    'portfolio_exists', portfolio_exists,
    'inviter_exists', inviter_exists,
    'inviter_role', inviter_role,
    'can_invite', (inviter_role = 'admin_partner' OR is_portfolio_owner(p_portfolio_id, p_inviter_id)),
    'portfolio_id', p_portfolio_id,
    'invited_email', p_invited_email,
    'inviter_id', p_inviter_id,
    'role', p_role
  );
  
  RETURN result;
END;
$$;
