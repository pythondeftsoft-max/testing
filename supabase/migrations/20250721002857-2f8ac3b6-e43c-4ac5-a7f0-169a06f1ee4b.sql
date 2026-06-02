
-- Fix the RLS policy that's causing permission denied for table users
-- The issue is that edge functions cannot directly access auth.users table

-- First, ensure we have the get_user_email function that can safely access auth.users
CREATE OR REPLACE FUNCTION public.get_user_email(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
    SELECT email FROM auth.users WHERE id = user_id;
$$;

-- Drop the problematic policy that directly accesses auth.users
DROP POLICY IF EXISTS "Invited users can view their invitations by email" ON public.account_invitations;

-- Recreate the policy using the security definer function instead
CREATE POLICY "Invited users can view their invitations by email"
ON public.account_invitations
FOR SELECT
TO authenticated
USING (email = get_user_email(auth.uid()));
